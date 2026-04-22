import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getStatuses = async (req: Request, res: Response) => {
  try {
    const statuses = await prisma.status.findMany({ orderBy: { order: 'asc' } });
    res.json({ success: true, statuses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPriorities = async (req: Request, res: Response) => {
  try {
    const priorities = await prisma.priority.findMany({ orderBy: { order: 'asc' } });
    res.json({ success: true, priorities });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTypes = async (req: Request, res: Response) => {
  try {
    const types = await prisma.type.findMany();
    res.json({ success: true, types });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany();
    res.json({ success: true, roles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getGroups = async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const page = parseInt(req.query.page as string) || 0;
  const type = req.query.type as string || 'all';

  try {
    if (type === 'all') {
      const groups = await prisma.group.findMany({
        skip: page * limit,
        take: limit,
        include: {
          members: { select: { id: true, fullname: true, email: true, image: true } },
          _count: { select: { tickets: true } },
        },
      });
      res.json({ success: true, groups, count: groups.length });
    } else {
      // For user-specific groups (non-admin)
      const userId = req.user?.id;
      const groups = await prisma.group.findMany({
        where: { memberIds: { has: userId } },
        include: {
          members: { select: { id: true, fullname: true, email: true, image: true } },
          _count: { select: { tickets: true } },
        },
      });
      res.json({ success: true, groups, count: groups.length });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createGroup = async (req: AuthRequest, res: Response) => {
  const { name, memberIds, isPublic } = req.body;
  try {
    const group = await prisma.group.create({
      data: { name, memberIds: memberIds || [], isPublic: isPublic || false },
      include: { members: { select: { id: true, fullname: true, email: true, image: true } } },
    });
    res.status(201).json({ success: true, group });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateGroup = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, memberIds, isPublic } = req.body;
  try {
    const data: any = {};
    if (name) data.name = name;
    if (memberIds) data.memberIds = memberIds;
    if (typeof isPublic === 'boolean') data.isPublic = isPublic;

    const group = await prisma.group.update({
      where: { id: id as string },
      data,
      include: { members: { select: { id: true, fullname: true, email: true, image: true } } },
    });
    res.json({ success: true, group });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteGroup = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // Check for existing tickets
    const ticketCount = await prisma.ticket.count({ where: { groupId: id as string } });
    if (ticketCount > 0) {
      return res.status(400).json({ success: false, error: 'Unable to delete group with tickets.' });
    }
    await prisma.group.delete({ where: { id: id as string } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Dashboard stats
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const [totalTickets, openTickets, resolvedTickets, users, recentTickets] = await Promise.all([
      prisma.ticket.count({ where: { deleted: false } }),
      prisma.ticket.count({ where: { deleted: false, status: { isResolved: false } } }),
      prisma.ticket.count({ where: { deleted: false, status: { isResolved: true } } }),
      prisma.user.count({ where: { deleted: false } }),
      prisma.ticket.findMany({
        where: { deleted: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          status: true,
          priority: true,
          owner: { select: { id: true, fullname: true, image: true } },
          assignee: { select: { id: true, fullname: true, image: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      stats: { totalTickets, openTickets, resolvedTickets, users },
      recentTickets,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
