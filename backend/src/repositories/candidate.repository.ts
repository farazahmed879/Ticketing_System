import prisma from "../prisma";

// Prisma's MongoDB connector turns case-insensitive `equals` into an
// unescaped regex, so parsed text like "**Python**" crashes the query.
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const candidateRepository = {
  /** Raw metaTags / observingSkills strings of all live candidates. */
  async findSearchLabels(): Promise<{ metaTags: string[]; observingSkills: string[] }> {
    const rows = await prisma.candidate.findMany({
      where: {
        deleted: false,
        OR: [{ metaTags: { not: null } }, { observingSkills: { not: null } }],
      },
      select: { metaTags: true, observingSkills: true },
    });
    return {
      metaTags: rows.map((r) => r.metaTags || ""),
      observingSkills: rows.map((r) => r.observingSkills || ""),
    };
  },

  async findMany(where: any, skip?: number, take?: number) {
    return prisma.candidate.findMany({
      where: { ...where, deleted: false },
      include: {
        _count: { select: { interviews: true } },
        createdBy: { select: { id: true, fullname: true, image: true } },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  },

  async count(where: any) {
    return prisma.candidate.count({ where: { ...where, deleted: false } });
  },

  async findById(id: string) {
    return prisma.candidate.findFirst({
      where: { id, deleted: false },
      include: {
        createdBy: { select: { id: true, fullname: true, image: true } },
        notesLog: { orderBy: { createdAt: "asc" } },
        interviews: {
          where: { deleted: false },
          include: {
            scheduledBy: { select: { id: true, fullname: true } },
            panelMembers: {
              include: {
                user: { select: { id: true, fullname: true, image: true } },
              },
            },
            _count: { select: { feedbacks: true } },
            feedbacks: {
              include: {
                interviewer: {
                  select: { id: true, fullname: true, image: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { scheduledAt: "asc" },
        },
      },
    });
  },

  async create(data: any) {
    return prisma.candidate.create({ data });
  },

  /**
   * Check if a non-deleted candidate with the same email + position already
   * exists. Used for the duplicate-check before insert (same person applying
   * for the same role is a duplicate; different role is allowed).
   */
  async findByEmailAndPosition(email: string, position: string) {
    return prisma.candidate.findFirst({
      where: {
        email: { equals: escapeRegex(email), mode: "insensitive" },
        position: { equals: escapeRegex(position), mode: "insensitive" },
        deleted: false,
      },
      select: { id: true, name: true, email: true, position: true },
    });
  },

  async update(id: string, data: any) {
    return prisma.candidate.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      select: { email: true },
    });
    if (!candidate) return null;
    return prisma.candidate.update({
      where: { id },
      data: {
        deleted: true,
        email: candidate.email.startsWith("deleted_")
          ? candidate.email
          : `deleted_${Date.now()}_${candidate.email}`,
      },
    });
  },

  /**
   * Rename emails of any existing soft-deleted candidates matching (email, position)
   * so MongoDB's unique index doesn't block creating a new candidate with the same email.
   */
  async clearSoftDeletedConflict(email: string, position: string) {
    if (!email || !position) return;
    const staleDeleted = await prisma.candidate.findMany({
      where: {
        email: { equals: escapeRegex(email), mode: "insensitive" },
        position: { equals: escapeRegex(position), mode: "insensitive" },
        deleted: true,
      },
      select: { id: true, email: true },
    });

    for (const c of staleDeleted) {
      if (!c.email.startsWith("deleted_")) {
        await prisma.candidate.update({
          where: { id: c.id },
          data: { email: `deleted_${Date.now()}_${c.email}` },
        });
      }
    }
  },

  async createNote(data: {
    candidateId: string;
    content: string;
    authorId?: string | null;
    authorName: string;
    authorRole?: string | null;
  }) {
    return prisma.candidateNote.create({ data });
  },

  async getLeaderboard() {
    return prisma.candidate.findMany({
      where: { deleted: false },
      include: {
        interviews: {
          where: { deleted: false },
          include: {
            feedbacks: {
              include: {
                interviewer: { select: { fullname: true, image: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getDistinctPositions() {
    const candidates = await prisma.candidate.findMany({
      where: { deleted: false, position: { not: "" } },
      select: { position: true },
      distinct: ["position"],
    });
    return candidates.map((c) => c.position).filter(Boolean);
  },

  async deleteAll() {
    const activeCandidates = await prisma.candidate.findMany({
      where: { deleted: false },
      select: { id: true, email: true },
    });

    const candidateIds = activeCandidates.map((c) => c.id);
    const timestamp = Date.now();

    for (const c of activeCandidates) {
      await prisma.candidate.update({
        where: { id: c.id },
        data: {
          deleted: true,
          email: c.email.startsWith("deleted_")
            ? c.email
            : `deleted_${timestamp}_${c.id}_${c.email}`,
        },
      });
    }

    if (candidateIds.length > 0) {
      await prisma.interview.updateMany({
        where: { candidateId: { in: candidateIds } },
        data: { deleted: true },
      });
    }

    return activeCandidates.length;
  },
};
