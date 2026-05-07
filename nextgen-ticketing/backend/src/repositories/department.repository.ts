import prisma from "../prisma";

export const departmentRepository = {
  async findMany() {
    return prisma.department.findMany({
      where: { deleted: false },
      include: {
        teams: { select: { id: true, name: true }, where: { deleted: false } },
        projects: { select: { id: true, name: true }, where: { deleted: false } },
      },
    });
  },

  async findById(id: string) {
    return prisma.department.findFirst({
      where: { id, deleted: false },
      include: {
        teams: { select: { id: true, name: true }, where: { deleted: false } },
        projects: { select: { id: true, name: true }, where: { deleted: false } },
      },
    });
  },

  async create(data: any) {
    return prisma.department.create({
      data,
      include: { teams: true, projects: true },
    });
  },

  async update(id: string, data: any) {
    return prisma.department.update({
      where: { id },
      data,
      include: { teams: true, projects: true },
    });
  },

  async delete(id: string) {
    return prisma.department.update({
      where: { id },
      data: { deleted: true },
    });
  },
};
