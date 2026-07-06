import prisma from "../prisma";

export const candidateRepository = {
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

  async update(id: string, data: any) {
    return prisma.candidate.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.candidate.update({
      where: { id },
      data: { deleted: true },
    });
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
};
