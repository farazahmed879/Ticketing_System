import bcrypt from "bcryptjs";
import { candidateRepository } from "../repositories/candidate.repository";
import { roleRepository } from "../repositories/role.repository";
import prisma from "../prisma";
import { RoleName } from "../utils/constants";
import { uploadToGoogleDrive } from "../services/googleDriveService";
import { resumeParserService } from "../services/resumeParserService";

export const candidateUsecase = {
  async getAllCandidates(filters: any) {
    const { search, status, position, skills, aiPrompt, limit, page } = filters;
    const where: any = {};

    const take = limit ? parseInt(limit as string) : undefined;
    const skip = page && take ? parseInt(page as string) * take : undefined;

    if (status && status !== "all") {
      where.status = status;
    }

    if (position) {
      where.position = { contains: position, mode: "insensitive" };
    }

    if (skills) {
      where.technicalSkills = { contains: skills, mode: "insensitive" };
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

    console.log("where", where);
    console.log("aiPrompt", aiPrompt);
    console.log("take", take);
    console.log("skip", skip);

    if (aiPrompt) {
      // For AI prompt, we need all matching candidates to score them
      candidates = await candidateRepository.findMany(where);
      total = candidates.length;

      const promptWords = (aiPrompt as string)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2);

      const scoredCandidates = candidates.map((c) => {
        let score = 0;
        const candidateText = [
          c.technicalSkills,
          c.workExperience,
          c.objective,
          c.notes,
          c.position,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        promptWords.forEach((word) => {
          const regex = new RegExp(`\\b${word}\\b`, "g");
          const matches = candidateText.match(regex);
          if (matches) {
            score += matches.length * 10;
          }
        });

        if (
          c.position &&
          promptWords.some((w) => c.position.toLowerCase().includes(w))
        ) {
          score += 25;
        }

        return { ...c, matchScore: Math.min(score, 100) };
      });

      scoredCandidates.sort(
        (a, b) => (b.matchScore || 0) - (a.matchScore || 0),
      );

      // Manually paginate the scored results
      if (take !== undefined && skip !== undefined) {
        candidates = scoredCandidates.slice(skip, skip + take);
      } else {
        candidates = scoredCandidates;
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

  async createCandidate(data: any) {
    return candidateRepository.create({
      ...data,
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
    });
  },

  async updateCandidate(id: string, data: any) {
    return candidateRepository.update(id, {
      ...data,
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
      const text = await resumeParserService.extractText(
        file.buffer,
        file.mimetype,
      );
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
