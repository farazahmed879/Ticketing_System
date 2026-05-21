import prisma from "../prisma";

export const projectRepository = {
  async findMany(params: any = {}) {
    const { departmentId, clientId, status } = params;
    const where: any = { deleted: false };
    
    if (departmentId) where.departmentId = departmentId;
    if (clientId) where.clientIds = { has: clientId };
    if (status) where.status = status;

    return prisma.project.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        clients: { select: { id: true, fullname: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.project.findFirst({
      where: { id, deleted: false },
      include: {
        department: { select: { id: true, name: true } },
        clients: { select: { id: true, fullname: true, image: true } },
        tickets: {
          where: { deleted: false },
          select: {
            id: true,
            uid: true,
            subject: true,
            createdAt: true,
            status: { select: { id: true, name: true, color: true } },
            priority: { select: { id: true, name: true, color: true } },
            assignee: { select: { id: true, fullname: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  async create(data: any) {
    return prisma.project.create({
      data,
      include: {
        department: true,
        clients: true,
      },
    });
  },

  async update(id: string, data: any) {
    return prisma.project.update({
      where: { id },
      data,
      include: {
        department: true,
        clients: true,
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
