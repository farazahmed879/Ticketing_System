import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getNotices = async (req: Request, res: Response) => {
  try {
    const notices = await prisma.notice.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, notices });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createNotice = async (req: AuthRequest, res: Response) => {
  const { name, message, color, fontColor } = req.body;
  try {
    const notice = await prisma.notice.create({
      data: { name, message, color: color || '#7c3aed', fontColor: fontColor || '#ffffff' },
    });
    res.status(201).json({ success: true, notice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateNotice = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, message, color, fontColor } = req.body;
  try {
    const notice = await prisma.notice.update({
      where: { id: id as string },
      data: { name, message, color, fontColor },
    });
    res.json({ success: true, notice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const activateNotice = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.notice.updateMany({ data: { active: false } });
    const notice = await prisma.notice.update({ where: { id: id as string }, data: { active: true } });
    res.json({ success: true, notice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const clearNotices = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notice.updateMany({ data: { active: false } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteNotice = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.notice.delete({ where: { id: id as string } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
