import prisma from "../prisma";

export const projectRepository = {
  async findMany(params: any = {}) {
    const { departmentId, teamId, status } = params;
    const where: any = { deleted: false };
    
    if (departmentId) where.departmentId = departmentId;
    if (teamId) where.teamIds = { has: teamId };
    if (status) where.status = status;

    return prisma.project.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        teams: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.project.findFirst({
      where: { id, deleted: false },
      include: {
        department: { select: { id: true, name: true } },
        teams: { select: { id: true, name: true } },
      },
    });
  },

  async create(data: any) {
    return prisma.project.create({
      data,
      include: {
        department: true,
        teams: true,
      },
    });
  },

  async update(id: string, data: any) {
    return prisma.project.update({
      where: { id },
      data,
      include: {
        department: true,
        teams: true,
      },
    });
  },

  async delete(id: string) {
    return prisma.project.update({
      where: { id },
      data: { deleted: true },
    });
  },
};
