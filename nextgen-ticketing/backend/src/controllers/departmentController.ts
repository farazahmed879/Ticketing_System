import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        teams: { select: { id: true, name: true } },
        groups: { select: { id: true, name: true } },
      },
    });
    res.json({ success: true, departments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
  const { name, description, teamIds, groupIds, allGroups } = req.body;
  try {
    const department = await prisma.department.create({
      data: {
        name,
        description,
        teamIds: teamIds || [],
        groupIds: groupIds || [],
        allGroups: allGroups || false,
      },
      include: { teams: true, groups: true },
    });
    res.status(201).json({ success: true, department });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, teamIds, groupIds, allGroups } = req.body;
  try {
    const data: any = {};
    if (name) data.name = name;
    if (teamIds) data.teamIds = teamIds;
    if (groupIds) data.groupIds = groupIds;
    if (typeof allGroups === 'boolean') data.allGroups = allGroups;

    const department = await prisma.department.update({
      where: { id: id as string },
      data,
      include: { teams: true, groups: true },
    });
    res.json({ success: true, department });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.department.delete({ where: { id: id as string } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
