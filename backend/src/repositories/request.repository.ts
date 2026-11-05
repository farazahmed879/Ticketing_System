import prisma from "../prisma";

const USER_SELECT = { id: true, fullname: true, email: true, image: true };

export const requestRepository = {
  async findMany(where: any = {}) {
    return prisma.userRequest.findMany({
      where: { ...where, deleted: false },
      include: {
        user: { select: USER_SELECT },
        approvedBy: { select: USER_SELECT },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.userRequest.findFirst({
      where: { id, deleted: false },
      include: {
        user: { select: USER_SELECT },
        approvedBy: { select: USER_SELECT },
      },
    });
  },

  async create(data: any) {
    return prisma.userRequest.create({
      data,
      include: {
        user: { select: USER_SELECT },
        approvedBy: { select: USER_SELECT },
      },
    });
  },

  async update(id: string, data: any) {
    return prisma.userRequest.update({
      where: { id },
      data,
      include: {
        user: { select: USER_SELECT },
        approvedBy: { select: USER_SELECT },
      },
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
