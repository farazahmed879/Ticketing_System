import prisma from "../prisma";

export const requestRepository = {
  async findMany(where: any = {}) {
    return prisma.userRequest.findMany({
      where,
      include: {
        user: { select: { id: true, fullname: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: any) {
    return prisma.userRequest.create({
      data,
      include: {
        user: { select: { id: true, fullname: true, email: true, image: true } },
      }
    });
  },

  async update(id: string, data: any) {
    return prisma.userRequest.update({
      where: { id },
      data,
      include: { user: true },
    });
  },

  async delete(id: string) {
    return prisma.userRequest.delete({ where: { id } });
  },

  async createNotification(data: any) {
    return prisma.notification.create({ data });
  },
};
