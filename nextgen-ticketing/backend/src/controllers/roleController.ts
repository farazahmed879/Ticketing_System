import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Get all roles
export const getRoles = async (req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } }
    });
    res.json({ success: true, roles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create role
export const createRole = async (req: AuthRequest, res: Response) => {
  const { name, description, isAdmin, isAgent, isCustomer, isEmployee, permissions } = req.body;
  try {
    const role = await prisma.role.create({
      data: { name, description, isAdmin, isAgent, isCustomer, isEmployee, permissions: permissions || {} }
    });
    res.status(201).json({ success: true, role });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update role
export const updateRole = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, isAdmin, isAgent, isCustomer, isEmployee, permissions } = req.body;
  try {
    const role = await prisma.role.update({
      where: { id: id as string },
      data: { name, description, isAdmin, isAgent, isCustomer, isEmployee, permissions: permissions || {} }
    });
    res.json({ success: true, role });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete role
export const deleteRole = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // Check if users are using this role
    const usersCount = await prisma.user.count({ where: { roleId: id as string } });
    if (usersCount > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete role assigned to users' });
    }

    await prisma.role.delete({ where: { id: id as string } });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
