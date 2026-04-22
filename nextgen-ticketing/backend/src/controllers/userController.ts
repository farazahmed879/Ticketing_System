import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { RoleName, RoleType } from "../utils/constants";

const prisma = new PrismaClient();

// Get users (by type: all, agents, admins, customers)
export const getUsers = async (req: AuthRequest, res: Response) => {
  const { type = RoleType.ALL, limit = "25", page = "0", showDeleted } = req.query;

  try {
    const take = parseInt(limit as string);
    const skip = parseInt(page as string) * take;

    let roleFilter: any = {};
    if (type === RoleType.AGENTS) roleFilter = { role: { OR: [{ isAgent: true }, { isEmployee: true }] } };
    else if (type === RoleType.ADMINS) roleFilter = { role: { isAdmin: true } };
    else if (type === RoleType.CUSTOMERS)
      roleFilter = { role: { name: RoleName.CUSTOMER } };

    const users = await prisma.user.findMany({
      where: {
        deleted: showDeleted === "true" ? undefined : false,
        ...roleFilter,
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        image: true,
        title: true,
        workNumber: true,
        mobileNumber: true,
        lastOnline: true,
        deleted: true,
        createdAt: true,
        role: true,
        groups: { select: { id: true, name: true } },
        teams: { select: { id: true, name: true } },
      },
      skip,
      take: take === -1 ? undefined : take,
      orderBy: { fullname: "asc" },
    });

    res.json({ success: true, accounts: users, count: users.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create user
export const createUser = async (req: AuthRequest, res: Response) => {
  const { email, password, fullname, title, roleId, groupIds, teamIds } =
    req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        fullname,
        title,
        roleId,
        groupIds: groupIds || [],
        teamIds: teamIds || [],
      },
      include: { role: true },
    });

    const { password: _, ...safeUser } = user;
    res.status(201).json({ success: true, account: safeUser });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update user
export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { fullname, email, title, roleId, password, groupIds, teamIds } =
    req.body;

  try {
    const data: any = {};
    if (fullname) data.fullname = fullname;
    if (email) data.email = email;
    if (title) data.title = title;
    if (roleId) data.roleId = roleId;
    if (groupIds) data.groupIds = groupIds;
    if (teamIds) data.teamIds = teamIds;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: id as string },
      data,
      include: {
        role: true,
        groups: { select: { id: true, name: true } },
        teams: { select: { id: true, name: true } },
      },
    });

    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Soft delete user
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.user.update({
      where: { id: id as string },
      data: { deleted: true },
    });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update own profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { fullname, title, workNumber, mobileNumber } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { fullname, title, workNumber, mobileNumber },
      include: { role: true },
    });
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update own password
export const updatePassword = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { currentPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid)
      return res.status(400).json({ message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
