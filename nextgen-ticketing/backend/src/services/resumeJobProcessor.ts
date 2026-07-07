import prisma from "../prisma";
import { downloadFromGoogleDrive } from "./googleDriveService";
import { llamaParseService } from "./llamaParseService";
import { resumeParserService } from "./resumeParserService";
import { candidateUsecase } from "../usecases/candidate.usecase";

/**
 * The heavy per-resume pipeline, run by the worker process (NOT the web
 * server): download from Drive → extract text (LlamaParse, falling back to
 * pdf-parse/mammoth) → regex-parse fields → create the candidate (which runs
 * the usual Claude enrichment + Gemini embedding inside createCandidate).
 *
 * The candidate payload mirrors what BulkUploadModal used to build client-side
 * (fallback name from filename, generated fallback email, "+92 " phone prefix,
 * bulk-upload note) so async bulk creates candidates identical to the old
 * synchronous flow.
 */

// Port of the frontend deriveNameFromFilename fallback.
function deriveNameFromFilename(filename: string): string {
  if (!filename) return "";
  let base = filename.replace(/\.[^.]+$/, "");
  base = base.replace(/([a-z])([A-Z])/g, "$1 $2");
  base = base.replace(/[_\-.()]+/g, " ");
  base = base.replace(
    /\b(resume|cv|curriculum|vitae|biodata|profile|final|new|updated?|copy|version|draft|latest)\b/gi,
    " ",
  );
  const tokens = base
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => {
      if (!t || t.length < 2) return false;
      if (/^\d+$/.test(t)) return false;
      if (/^v\d+$/i.test(t)) return false;
      return /^[A-Za-z]/.test(t);
    });
  if (tokens.length === 0 || tokens.length > 4) return "";
  return tokens
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
    .join(" ");
}

export interface ResumeJobRecord {
  id: string;
  driveFileId: string;
  driveUrl: string;
  originalName: string;
  mimetype: string;
  createdById: string | null;
}

export async function processResumeJob(
  job: ResumeJobRecord,
): Promise<{ candidateId: string; candidateName: string }> {
  // Idempotency: if a previous attempt already created the candidate but
  // crashed before marking the job done, reuse it instead of duplicating.
  const existing = await prisma.candidate.findFirst({
    where: { resumeJobId: job.id },
    select: { id: true, name: true },
  });
  if (existing) {
    return { candidateId: existing.id, candidateName: existing.name };
  }

  const buffer = await downloadFromGoogleDrive(job.driveFileId);

  // Extract text: LlamaParse first, basic extractor as fallback.
  let text = "";
  try {
    text = await llamaParseService.extractText(
      buffer,
      job.originalName,
      job.mimetype,
    );
  } catch (llamaError) {
    console.error(
      `[worker] LlamaParse failed for ${job.originalName}, falling back:`,
      llamaError,
    );
    text = await resumeParserService.extractText(buffer, job.mimetype);
  }

  const parsed: any = text ? resumeParserService.parseData(text) : {};

  const name =
    parsed.name || deriveNameFromFilename(job.originalName) || "Unknown Candidate";

  const payload = {
    name,
    email:
      parsed.email ||
      `${Math.random().toString(36).substring(7)}@example.com`,
    phone: parsed.phone ? `+92 ${parsed.phone}` : "",
    position: parsed.position || "Applicant",
    resumeUrl: job.driveUrl,
    notes: text ? "Automatically created from bulk upload." : "",
    status: "Active",
    cnic: parsed.cnic || null,
    address: parsed.address || null,
    linkedin: parsed.linkedin || null,
    portfolio: parsed.portfolio || null,
    github: parsed.github || null,
    projects: parsed.projects || null,
    objective: parsed.objective || null,
    technicalSkills: parsed.technicalSkills || null,
    workExperience: parsed.workExperience || null,
    dob: parsed.dob || null,
    nationality: parsed.nationality || null,
    city: parsed.city || null,
    resumeJobId: job.id,
  };

  try {
    const candidate = await candidateUsecase.createCandidate(
      payload,
      job.createdById || undefined,
    );
    return { candidateId: candidate.id, candidateName: candidate.name };
  } catch (err: any) {
    // Surface the common unique-email conflict with a readable message.
    if (err?.code === "P2002") {
      throw new Error(
        `A candidate with email ${payload.email} already exists`,
      );
    }
    throw err;
  }
}
