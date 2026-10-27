import prisma from "../prisma";

/**
 * Mongo-backed job queue for async bulk-resume processing.
 *
 * Leasing must be atomic (two workers must never claim the same job), which
 * Prisma can't express on a non-unique filter — so the claim itself uses the
 * native findAndModify via $runCommandRaw, then the claimed row is re-read
 * with Prisma for normal typing.
 *
 * A job is claimable when:
 *   - status is "pending", OR
 *   - status is "processing" but the lease is stale (worker crashed mid-job)
 * and it has attempts left. attempts is incremented at claim time, so a
 * poison file can't be retried forever.
 */

export const RESUME_JOB_MAX_ATTEMPTS = 3;
export const RESUME_JOB_LEASE_MS = 10 * 60 * 1000; // 10 minutes

export const resumeJobRepository = {
  async create(data: {
    driveFileId: string;
    driveUrl: string;
    originalName: string;
    mimetype: string;
    createdById?: string | null;
  }) {
    return prisma.resumeJob.create({ data });
  },

  /**
   * Atomically claim the oldest claimable job (or null if none). Increments
   * attempts and stamps the lease in the same operation.
   */
  async leaseNext() {
    const staleCutoff = new Date(Date.now() - RESUME_JOB_LEASE_MS);
    const result: any = await prisma.$runCommandRaw({
      findAndModify: "ResumeJob",
      query: {
        $or: [
          { status: "pending" },
          {
            status: "processing",
            leasedAt: { $lt: { $date: staleCutoff.toISOString() } },
          },
        ],
        attempts: { $lt: RESUME_JOB_MAX_ATTEMPTS },
      },
      sort: { createdAt: 1 },
      update: {
        $set: {
          status: "processing",
          leasedAt: { $date: new Date().toISOString() },
        },
        $inc: { attempts: 1 },
      },
      // Only need the id back; the full row is re-read via Prisma below.
      fields: { _id: 1 },
    });

    const rawId = result?.value?._id;
    const id = typeof rawId === "object" ? rawId?.$oid : rawId;
    if (!id) return null;
    return prisma.resumeJob.findUnique({ where: { id } });
  },

  async markDone(id: string, candidateId: string, candidateName: string) {
    return prisma.resumeJob.update({
      where: { id },
      data: { status: "done", candidateId, candidateName, error: null },
    });
  },

  async markNeedsTitle(
    id: string,
    candidateName: string,
    parsedData: any,
    parsedPosition?: string | null,
  ) {
    return prisma.resumeJob.update({
      where: { id },
      data: {
        status: "needs_title",
        candidateName,
        parsedData,
        parsedPosition: parsedPosition || null,
        error: null,
        leasedAt: null,
      },
    });
  },

  async markDuplicateFound(
    id: string,
    existingCandidateId: string,
    candidateName: string,
    parsedData: any,
    parsedPosition?: string | null,
  ) {
    return prisma.resumeJob.update({
      where: { id },
      data: {
        status: "duplicate_found",
        existingCandidateId,
        candidateName,
        parsedData,
        parsedPosition: parsedPosition || null,
        error: "A candidate with this email already applied for this role.",
        leasedAt: null,
      },
    });
  },

  async markReplaced(id: string, candidateId: string, candidateName: string) {
    return prisma.resumeJob.update({
      where: { id },
      data: { status: "replaced", candidateId, candidateName, error: null },
    });
  },

  async markSkipped(id: string) {
    return prisma.resumeJob.update({
      where: { id },
      data: { status: "skipped_by_user", error: "Skipped by user" },
    });
  },

  /**
   * Record a failure. Jobs with attempts left go back to "pending" for a
   * prompt retry; exhausted jobs are marked "failed" permanently.
   */
  async markFailed(id: string, error: string, attempts: number) {
    const final = attempts >= RESUME_JOB_MAX_ATTEMPTS;
    return prisma.resumeJob.update({
      where: { id },
      data: {
        status: final ? "failed" : "pending",
        error: error.slice(0, 1000),
        leasedAt: null,
      },
    });
  },

  /** Release an in-flight job untouched (graceful shutdown). */
  async release(id: string) {
    return prisma.resumeJob.update({
      where: { id },
      data: { status: "pending", leasedAt: null },
    });
  },

  async findByIds(ids: string[]) {
    return prisma.resumeJob.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        originalName: true,
        driveUrl: true,
        error: true,
        candidateId: true,
        candidateName: true,
        parsedData: true,
        parsedPosition: true,
        existingCandidateId: true,
        attempts: true,
      },
    });
  },

  /** Backpressure: how many jobs a user already has in flight. */
  async countActiveByUser(createdById: string) {
    return prisma.resumeJob.count({
      where: { createdById, status: { in: ["pending", "processing"] } },
    });
  },
};
