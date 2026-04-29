import prisma from "../prisma";

export const candidateRepository = {
  async findMany(where: any, skip?: number, take?: number) {
    return prisma.candidate.findMany({
      where,
      include: {
        _count: { select: { interviews: true } },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  },

  async count(where: any) {
    return prisma.candidate.count({ where });
  },

  async findById(id: string) {
    return prisma.candidate.findUnique({
      where: { id },
      include: {
        interviews: {
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
                interviewer: { select: { id: true, fullname: true, image: true } }
              },
              orderBy: { createdAt: "asc" }
            }
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
    return prisma.candidate.delete({ where: { id } });
  },

  async getLeaderboard() {
    return prisma.candidate.findMany({
      include: {
        interviews: {
          include: {
            feedbacks: {
              include: {
                interviewer: { select: { fullname: true, image: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  },
};
