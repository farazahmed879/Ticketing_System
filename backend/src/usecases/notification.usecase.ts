import { notificationRepository } from "../repositories/notification.repository";

export const notificationUsecase = {
  async getNotifications(userId: string, pageStr: string, limitStr: string) {
    const page = parseInt(pageStr) || 0;
    const limit = parseInt(limitStr) || 20;
    const skip = page * limit;

    const [items, unreadCount, totalCount] = await Promise.all([
      notificationRepository.findMany(userId, skip, limit),
      notificationRepository.countUnread(userId),
      notificationRepository.countTotal(userId),
    ]);

    return { items, unreadCount, totalCount };
  },

  async markRead(id: string) {
    return notificationRepository.markRead(id);
  },

  async markAllRead(userId: string) {
    return notificationRepository.markAllRead(userId);
  },

  async clearNotifications(userId: string) {
    return notificationRepository.deleteAll(userId);
  },
};
