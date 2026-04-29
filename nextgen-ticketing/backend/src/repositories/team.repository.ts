import prisma from "../prisma";

export const teamRepository = {
  async findMany(skip: number = 0, take: number = 50) {
    return prisma.team.findMany({
      skip,
      take,
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true, role: true },
        },
        department: { select: { id: true, name: true } },
        projects: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  async create(data: any) {
    return prisma.team.create({
      data,
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        department: true,
        projects: true,
      },
    });
  },

  async update(id: string, data: any) {
    return prisma.team.update({
      where: { id },
      data,
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        department: true,
        projects: true,
      },
    });
  },

  async delete(id: string) {
    return prisma.team.delete({ where: { id } });
  },
};
