import prisma from "../prisma";

export const teamRepository = {
  async findMany(skip: number = 0, take?: number, search?: string) {
    const where: any = { deleted: false };
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { department: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    // Lean projection — only what the team list UI needs.
    return prisma.team.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        name: true,
        description: true,
        department: { select: { id: true, name: true } },
        teamLead: { select: { id: true, fullname: true, image: true } },
        members: {
          where: { deleted: false },
          select: { id: true, fullname: true, image: true },
        },
        projects: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.team.findFirst({
      where: { id, deleted: false },
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true, role: true },
        },
        teamLead: { select: { id: true, fullname: true, email: true, image: true } },
        department: true,
        projects: { select: { id: true, name: true } },
      },
    });
  },

  async count() {
    return prisma.team.count({ where: { deleted: false } });
  },

  async create(data: any) {
    return prisma.team.create({
      data,
      include: {
        members: {
          select: { id: true, fullname: true, email: true, image: true },
        },
        teamLead: { select: { id: true, fullname: true, email: true, image: true } },
        department: true,
        projects: { select: { id: true, name: true } },
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
        teamLead: { select: { id: true, fullname: true, email: true, image: true } },
        department: true,
        projects: { select: { id: true, name: true } },
      },
    });
  },

  async delete(id: string) {
    return prisma.team.update({
      where: { id },
      data: { deleted: true },
    });
  },
};
