import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getNotifications = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const page = parseInt(req.query.page as string) || 0;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = page * limit;

  try {
    const [items, unreadCount, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: skip,
      }),
      prisma.notification.count({ where: { userId, unread: true } }),
      prisma.notification.count({ where: { userId } }),
    ]);
    res.json({ success: true, items, count: unreadCount, totalCount });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const markRead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.notification.update({ where: { id: id as string }, data: { unread: false } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    await prisma.notification.updateMany({
      where: { userId, unread: true },
      data: { unread: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const clearNotifications = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    await prisma.notification.deleteMany({ where: { userId } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
