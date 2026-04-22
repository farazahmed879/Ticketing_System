import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getTeams = async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 25;
  const page = parseInt(req.query.page as string) || 0;
  try {
    const teams = await prisma.team.findMany({
      skip: page * limit,
      take: limit,
      include: { members: { select: { id: true, fullname: true, email: true, image: true, role: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, teams, count: teams.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createTeam = async (req: AuthRequest, res: Response) => {
  const { name, memberIds } = req.body;
  try {
    const team = await prisma.team.create({
      data: { name, memberIds: memberIds || [] },
      include: { members: { select: { id: true, fullname: true, email: true, image: true } } },
    });
    res.status(201).json({ success: true, team });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTeam = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, memberIds } = req.body;
  try {
    const data: any = {};
    if (name) data.name = name;
    if (memberIds) data.memberIds = memberIds;
    const team = await prisma.team.update({
      where: { id: id as string },
      data,
      include: { members: { select: { id: true, fullname: true, email: true, image: true } } },
    });
    res.json({ success: true, team });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteTeam = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.team.delete({ where: { id: id as string } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
