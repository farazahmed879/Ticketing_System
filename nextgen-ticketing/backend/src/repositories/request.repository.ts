import prisma from "../prisma";

export const requestRepository = {
  async findMany() {
    return prisma.userRequest.findMany({
      include: {
        user: { select: { id: true, fullname: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
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
