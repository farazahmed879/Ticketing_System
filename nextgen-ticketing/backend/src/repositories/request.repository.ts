import prisma from "../prisma";

export const requestRepository = {
  async findMany(where: any = {}) {
    return prisma.userRequest.findMany({
      where: { ...where, deleted: false },
      include: {
        user: { select: { id: true, fullname: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.userRequest.findFirst({
      where: { id, deleted: false },
      include: {
        user: { select: { id: true, fullname: true, email: true, image: true } },
      },
    });
  },

  async create(data: any) {
    return prisma.userRequest.create({
      data,
      include: {
        user: { select: { id: true, fullname: true, email: true, image: true } },
      },
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
    return prisma.userRequest.update({
      where: { id },
      data: { deleted: true },
    });
  },

  async createNotification(data: any) {
    return prisma.notification.create({ data });
  },
};
