import prisma from "../prisma";

export const departmentRepository = {
  async findMany() {
    return prisma.department.findMany({
      include: {
        teams: { select: { id: true, name: true } },
        projects: { select: { id: true, name: true } },
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
    return prisma.department.delete({ where: { id } });
  },
};
