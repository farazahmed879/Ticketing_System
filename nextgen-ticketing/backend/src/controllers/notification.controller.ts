import { Response } from "express";
import { AuthRequest } from "../types";
import { notificationUsecase } from "../usecases/notification.usecase";

export const notificationController = {
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const page = req.query.page as string;
      const limit = req.query.limit as string;

      const { items, unreadCount, totalCount } =
        await notificationUsecase.getNotifications(userId, page, limit);

      res.json({ success: true, items, count: unreadCount, totalCount });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async markRead(req: AuthRequest, res: Response) {
    try {
      await notificationUsecase.markRead(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async markAllRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      await notificationUsecase.markAllRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async clearNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      await notificationUsecase.clearNotifications(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
