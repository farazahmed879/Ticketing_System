import bcrypt from "bcryptjs";
import { candidateRepository } from "../repositories/candidate.repository";
import { roleRepository } from "../repositories/role.repository";
import prisma from "../prisma";
import { RoleName } from "../utils/constants";
import { uploadToGoogleDrive } from "../services/googleDriveService";
import { resumeParserService } from "../services/resumeParserService";
import { llamaParseService } from "../services/llamaParseService";
import { aiSearchService } from "../services/aiSearchService";
import { embeddingService } from "../services/embeddingService";

/**
 * Best-effort write-time enrichment + embedding: derive normalized skills +
 * yearsExperience (Claude) and a semantic profile vector (BGE) from the
 * candidate's text. Never blocks the write — on any failure we persist what we
 * have and rely on the backfill script to fill the rest in later.
 */
async function safeEnrichAndEmbed(data: any): Promise<{
  skills: string[];
  yearsExperience: number | null;
  skillEmbedding: number[];
}> {
  const text = aiSearchService.candidateEnrichmentText(data);
  if (!text) return { skills: [], yearsExperience: null, skillEmbedding: [] };

  let skills: string[] = [];
  let yearsExperience: number | null = null;
  try {
    ({ skills, yearsExperience } = await aiSearchService.enrichCandidate(text));
  } catch (err) {
    console.error("Candidate enrichment failed (persisting empty):", err);
  }

  let skillEmbedding: number[] = [];
  try {
    // Embed a concise role+skills text (avoids diluting the signal with prose).
    const profileText = aiSearchService.embeddingProfileText({
      position: data.position,
      skills,
      technicalSkills: data.technicalSkills,
    });
    skillEmbedding = await embeddingService.embedProfile(profileText);
  } catch (err) {
    console.error("Candidate embedding failed (persisting empty):", err);
  }

  return { skills, yearsExperience, skillEmbedding };
}

export const candidateUsecase = {
  async getAllCandidates(filters: any) {
    const { search, status, position, skills, aiPrompt, limit, page, city, immediateJoiner, dateFrom, dateTo } = filters;
    const where: any = {};

    const take = limit ? parseInt(limit as string) : undefined;
    const skip = page && take ? parseInt(page as string) * take : undefined;

    if (status && status !== "all") {
      if (status === "exclude_hired") {
        where.status = { not: "Hired" };
      } else {
        where.status = status;
      }
    }

    if (position) {
      where.position = { contains: position, mode: "insensitive" };
    }

    if (skills) {
      where.technicalSkills = { contains: skills, mode: "insensitive" };
    }

    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    if (immediateJoiner === "true") {
      where.immediateJoiner = true;
    } else if (immediateJoiner === "false") {
      where.immediateJoiner = false;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) {
        const to = new Date(dateTo as string);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { position: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { cnic: { contains: search, mode: "insensitive" } },
      ];
    }

    let candidates: any[];
    let total: number;

    if (aiPrompt) {
      try {
        // Hybrid AI search:
        //  1) Claude parses the NL query into structured constraints + topic.
        //  2) Structured constraints (years/status/failed-before) filter in Mongo.
        //  3a) If the query names a SKILL, exact (alias-normalized) skill
        //      matching against candidate.skills[] is the primary signal — only
        //      candidates who actually have a required skill are returned, ranked
        //      by how many they have, then by semantic closeness.
        //  3b) If the query names NO skill (e.g. "senior frontend dev"), fall
        //      back to pure semantic vector ranking with a relevance floor.
        const filter = await aiSearchService.parseQuery(aiPrompt as string);
        const aiWhere = aiSearchService.toPrismaWhere(filter);

        const topicText = aiSearchService.queryTopicText(filter);
        const roleKey = aiSearchService.roleOf(filter.position);
        const hasSkills = filter.skills.length > 0;

        // If the query is too vague to search on, tell the user instead of
        // returning arbitrary matches. Loose keywords/position don't count as a
        // concrete signal here — only a real skill, role, seniority, or status.
        const hasConcreteSignal =
          hasSkills ||
          !!roleKey ||
          filter.minYearsExperience != null ||
          filter.statuses.length > 0 ||
          filter.failedInterviewBefore;
        if (filter.vague && !hasConcreteSignal) {
          return {
            candidates: [],
            total: 0,
            vague: true,
            message:
              'Your search is too vague to match on. Try naming a skill, technology, or role — e.g. "React developer", "3+ years Python", or ".net devs".',
          };
        }

        // Merge any UI filters already in `where` with the structured constraints.
        const merged: any = { ...where };
        if (aiWhere.AND) {
          merged.AND = [...(where.AND || []), ...aiWhere.AND];
        }

        // Fetch all structurally-matching candidates; rank + paginate in app.
        let matched = await candidateRepository.findMany(merged);

        if (hasSkills || roleKey) {
          // --- Skill / role path ---
          // Exact skill coverage (if the query named skills) and/or role-tech
          // count (if it named a role like "backend") drive the results. When
          // both are present the explicit skill is mandatory and the role is a
          // ranking signal. Semantic sim is only a final tie-breaker, so it's
          // optional: if the embedding call fails we still rank by skills/role.
          let queryVec: number[] = [];
          try {
            queryVec = await embeddingService.embedQuery(topicText);
          } catch (embedErr) {
            console.error("Query embed failed; ranking by skills/role only:", embedErr);
          }

          const scored = matched
            .map((c) => {
              const coverage = hasSkills
                ? aiSearchService.skillCoverage(filter.skills, (c as any).skills)
                : 0;
              const roleHits = roleKey
                ? aiSearchService.roleSkillHits(roleKey, c as any)
                : 0;
              const sim = queryVec.length
                ? embeddingService.cosineSimilarity(
                    queryVec,
                    (c as any).skillEmbedding || [],
                  )
                : 0;
              // Skill coverage drives the score when skills were named;
              // otherwise an ABSOLUTE role-fit score: each role technology the
              // candidate has is ~33%, so a single incidental tool reads as a
              // weak match (~33%) rather than being inflated to 100%.
              const matchScore = hasSkills
                ? Math.round(coverage * 100)
                : Math.min(100, roleHits * 33);
              return { ...c, _coverage: coverage, _role: roleHits, _sim: sim, matchScore };
            })
            // Must have a requested skill (skill query) or at least one role
            // technology (role query). No match => not returned.
            .filter((c) => (hasSkills ? c._coverage > 0 : c._role > 0))
            .sort(
              (a, b) =>
                b._coverage - a._coverage ||
                b._role - a._role ||
                b._sim - a._sim,
            );

          matched = scored.map(({ _coverage, _role, _sim, ...c }) => c);
        } else if (topicText) {
          // --- Semantic-only path (no explicit skill in the query) ---
          const queryVec = await embeddingService.embedQuery(topicText);
          const scored = matched.map((c) => {
            const sim = embeddingService.cosineSimilarity(
              queryVec,
              (c as any).skillEmbedding || [],
            );
            return {
              ...c,
              _score: sim,
              matchScore: Math.min(100, Math.round(sim * 100)),
            };
          });
          scored.sort((a, b) => b._score - a._score);

          // Keep results within a margin of the best match (and above a sane
          // floor). If nothing clears the floor, return empty rather than
          // dumping every candidate.
          const top = scored[0]?._score ?? 0;
          const REL_GAP = 0.08;
          const ABS_FLOOR = 0.6;
          const ranked = scored.filter(
            (c) => c._score >= Math.max(ABS_FLOOR, top - REL_GAP),
          );
          matched = ranked.map(({ _score, ...c }) => c);
        }
        // else: pure structured query (e.g. "rejected candidates") -> return
        // the structurally-matched set as-is.

        total = matched.length;
        candidates =
          take !== undefined && skip !== undefined
            ? matched.slice(skip, skip + take)
            : matched;
      } catch (err) {
        // Fallback (error only): naive keyword scorer over all candidates,
        // so search degrades gracefully if the LLM call fails.
        console.error("AI search failed, falling back to keyword scorer:", err);

        candidates = await candidateRepository.findMany(where);

        // Colleague's improved keyword scorer (normalizes front-end/back-end
        // etc. + simple plurals) — reused here as the error-only fallback.
        const normalizeTechTerms = (text: string) =>
          text
            .toLowerCase()
            .replace(/front[-\s]end/g, "frontend")
            .replace(/back[-\s]end/g, "backend")
            .replace(/full[-\s]stack/g, "fullstack")
            .replace(/react[-\s]js/g, "reactjs")
            .replace(/node[-\s]js/g, "nodejs")
            .replace(/vue[-\s]js/g, "vuejs");

        const promptWords = normalizeTechTerms(aiPrompt as string)
          .replace(/[^a-z0-9\s]/g, "")
          .split(/\s+/)
          .map((w) => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w))
          .filter((w) => w.length > 2);

        const scoredCandidates = candidates
          .map((c) => {
            let score = 0;
            const candidateText = normalizeTechTerms(
              [
                c.technicalSkills,
                c.workExperience,
                c.objective,
                c.notes,
                c.position,
              ]
                .filter(Boolean)
                .join(" "),
            );

            promptWords.forEach((word) => {
              const regex = new RegExp(`\\b${word}(s|es)?\\b`, "g");
              const matches = candidateText.match(regex);
              if (matches) {
                score += matches.length * 10;
              }
            });

            if (
              c.position &&
              promptWords.some((w) => {
                const pos = normalizeTechTerms(c.position);
                return new RegExp(`\\b${w}(s|es)?\\b`).test(pos);
              })
            ) {
              score += 25;
            }

            return { ...c, matchScore: Math.min(score, 100) };
          })
          .filter((c) => c.matchScore > 0);

        total = scoredCandidates.length;

        scoredCandidates.sort(
          (a, b) => (b.matchScore || 0) - (a.matchScore || 0),
        );

        // Manually paginate the scored results
        if (take !== undefined && skip !== undefined) {
          candidates = scoredCandidates.slice(skip, skip + take);
        } else {
          candidates = scoredCandidates;
        }
      }
    } else {
      [candidates, total] = await Promise.all([
        candidateRepository.findMany(where, skip, take),
        candidateRepository.count(where),
      ]);
    }

    return { candidates, total };
  },

  async getCandidateById(id: string) {
    const candidate = await candidateRepository.findById(id);
    if (!candidate) {
      throw new Error("Candidate not found");
    }
    return candidate;
  },

  async createCandidate(data: any, createdById?: string) {
    const enrichment = await safeEnrichAndEmbed(data);
    return candidateRepository.create({
      ...data,
      createdById: createdById || null,
      skills: enrichment.skills,
      yearsExperience: enrichment.yearsExperience,
      skillEmbedding: enrichment.skillEmbedding,
      phone: data.phone || null,
      cnic: data.cnic || null,
      address: data.address || null,
      resumeUrl: data.resumeUrl || null,
      notes: data.notes || null,
      objective: data.objective || null,
      technicalSkills: data.technicalSkills || null,
      workExperience: data.workExperience || null,
      linkedin: data.linkedin || null,
      portfolio: data.portfolio || null,
      github: data.github || null,
      projects: data.projects || null,
      status: data.status || "Active",
      dob: data.dob ? new Date(data.dob) : null,
      nationality: data.nationality || null,
      city: data.city || null,
      immediateJoiner: data.immediateJoiner === true || data.immediateJoiner === "true" ? true : false,
    });
  },

  async updateCandidate(id: string, data: any) {
    const enrichment = await safeEnrichAndEmbed(data);
    return candidateRepository.update(id, {
      ...data,
      skills: enrichment.skills,
      yearsExperience: enrichment.yearsExperience,
      skillEmbedding: enrichment.skillEmbedding,
      phone: data.phone || null,
      cnic: data.cnic || null,
      address: data.address || null,
      resumeUrl: data.resumeUrl || null,
      notes: data.notes || null,
      objective: data.objective || null,
      technicalSkills: data.technicalSkills || null,
      workExperience: data.workExperience || null,
      linkedin: data.linkedin || null,
      portfolio: data.portfolio || null,
      github: data.github || null,
      projects: data.projects || null,
      dob: data.dob ? new Date(data.dob) : null,
      nationality: data.nationality || null,
      city: data.city || null,
      immediateJoiner: data.immediateJoiner === true || data.immediateJoiner === "true" ? true : false,
    });
  },

  async deleteCandidate(id: string) {
    return candidateRepository.delete(id);
  },

  async uploadResume(file: any) {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(
        "Invalid file type. Only PDF and DOCX files are allowed.",
      );
    }

    const driveUrl = await uploadToGoogleDrive(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    if (!driveUrl) {
      throw new Error("Google Drive credentials not configured.");
    }

    // Parse Resume Data
    let parsedData: any = {
      name: null,
      position: null,
      email: null,
      phone: null,
      cnic: null,
      address: null,
      linkedin: null,
      portfolio: null,
      github: null,
      dob: null,
      nationality: null,
      city: null,
      objective: "",
      workExperience: "",
      technicalSkills: "",
      projects: "",
    };
    try {
      // Primary: LlamaParse (handles layout/tables/scanned PDFs). Falls back to
      // the basic pdf-parse/mammoth extractor if LlamaParse is unavailable.
      let text: string;
      try {
        text = await llamaParseService.extractText(
          file.buffer,
          file.originalname,
          file.mimetype,
        );
      } catch (llamaError) {
        console.error(
          "LlamaParse failed, falling back to basic extractor:",
          llamaError,
        );
        text = await resumeParserService.extractText(
          file.buffer,
          file.mimetype,
        );
      }
      parsedData = { ...parsedData, ...resumeParserService.parseData(text) };
    } catch (parseError) {
      console.error("Failed to parse resume text:", parseError);
    }

    return { driveUrl, parsedData };
  },

  async convertToUser(id: string) {
    const candidate = await candidateRepository.findById(id);
    if (!candidate) throw new Error("Candidate not found");
    if (candidate.isConverted)
      throw new Error("Candidate already converted to user");

    // Default role for converted candidates
    const role = await roleRepository.findByName(RoleName.EMPLOYEE);
    if (!role) throw new Error("Default Employee role not found");

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: candidate.email,
          password: hashedPassword,
          fullname: candidate.name,
          roleId: role.id,
          title: candidate.position,
          mobileNumber: candidate.phone,
          primaryContact: candidate.phone,
          cnic: candidate.cnic,
          address: candidate.address,
          primaryResumeUrl: candidate.resumeUrl,
          linkedInUrl: candidate.linkedin,
          gitUrl: candidate.github || candidate.portfolio,
          nationality: candidate.nationality,
          location: candidate.city,
        },
      });

      // 2. Mark Candidate as Converted
      await tx.candidate.update({
        where: { id },
        data: { isConverted: true, status: "Hired" },
      });

      return { user, tempPassword };
    });

    return result;
  },

  async getLeaderboard() {
    const rawCandidates = await candidateRepository.getLeaderboard();

    const leaderboard = rawCandidates.map((candidate) => {
      let totalScore = 0;
      let totalFeedbacks = 0;
      const recommendations: Record<string, number> = {};

      candidate.interviews.forEach((interview) => {
        interview.feedbacks.forEach((feedback) => {
          totalScore += feedback.overallRating;
          totalFeedbacks++;
          recommendations[feedback.recommendation] =
            (recommendations[feedback.recommendation] || 0) + 1;
        });
      });

      const averageRating =
        totalFeedbacks > 0 ? totalScore / totalFeedbacks : 0;

      return {
        id: candidate.id,
        name: candidate.name,
        position: candidate.position,
        status: candidate.status,
        averageRating: Number(averageRating.toFixed(2)),
        interviewCount: candidate.interviews.length,
        feedbackCount: totalFeedbacks,
        topRecommendation:
          Object.entries(recommendations).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          "None",
        lastInterviewDate:
          candidate.interviews.sort(
            (a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime(),
          )[0]?.scheduledAt || null,
      };
    });

    // Sort by average rating, then by number of interviews
    return leaderboard.sort((a, b) => {
      if (b.averageRating !== a.averageRating) {
        return b.averageRating - a.averageRating;
      }
      return b.interviewCount - a.interviewCount;
    });
  },
};
