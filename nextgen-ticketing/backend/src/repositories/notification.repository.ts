import prisma from "../prisma";

export const notificationRepository = {
  async findMany(userId: string, skip: number, take: number) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
  },

  async countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, unread: true } });
  },

  async countTotal(userId: string) {
    return prisma.notification.count({ where: { userId } });
  },

  async markRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { unread: false },
    });
  },

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, unread: true },
      data: { unread: false },
    });
  },

  async deleteAll(userId: string) {
    return prisma.notification.deleteMany({ where: { userId } });
  },
};
