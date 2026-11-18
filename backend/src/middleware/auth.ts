import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { AuthRequest } from "../types";
import prisma from "../prisma";
import { RoleType } from "../utils/constants";

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const checkRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // console.log("req", req?.user?.role);
    if (
      !req.user ||
      !roles
        .map((role) => role.toLowerCase())
        .includes(req.user.role.toLowerCase())
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};

/**
 * Loads the caller's role from the DB (the JWT only carries {id, role}, and
 * role permissions can be edited at any time from the Roles screen) and
 * attaches roleType + permissions to req.user. Rejects deleted users and
 * users whose role was removed, so a stale token can't keep acting.
 */
export const loadCallerRole = async (req: AuthRequest) => {
  if (!req.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      deleted: true,
      role: { select: { roleType: true, permissions: true, deleted: true, canDelete: true } },
    },
  });
  if (!user || user.deleted || !user.role || user.role.deleted) return null;
  req.user.role = user.role.roleType;
  req.user.permissions = user.role.permissions;
  req.user.canDelete = user.role.canDelete;
  return user.role;
};

/**
 * True unless the caller's role is delete-restricted (Sub Admin: an admin
 * roleType with canDelete=false). Use where admin/manager power lets someone
 * delete what they don't own; deleting your own things stays allowed.
 */
export const callerMayUseDeletePower = async (req: AuthRequest) => {
  const role = await loadCallerRole(req);
  return !!role && role.canDelete !== false;
};

/** Route guard: 403 for delete-restricted roles (Sub Admin). */
export const denyRestrictedDelete = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = await loadCallerRole(req);
    if (!role) {
      return res.status(401).json({ message: "Account is no longer active" });
    }
    if (role.canDelete === false) {
      return res.status(403).json({ message: "Your role is not allowed to delete" });
    }
    next();
  } catch (error) {
    console.error("[auth] delete check failed:", error);
    return res.status(500).json({ message: "Permission check failed" });
  }
};

/**
 * Permission guard mirroring the frontend's hasPermission(): admins always
 * pass; everyone else needs role.permissions[module][action] === true.
 * Usage: requirePermission("users.create")
 */
export const requirePermission = (permPath: string) => {
  const [module, action] = permPath.split(".");
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const role = await loadCallerRole(req);
      if (!role) {
        return res.status(401).json({ message: "Account is no longer active" });
      }
      // Delete-restricted roles (Sub Admin) never delete, admin or not.
      if (action === "delete" && role.canDelete === false) {
        return res.status(403).json({ message: "Your role is not allowed to delete" });
      }
      if (role.roleType === RoleType.ADMIN) return next();
      const perms = role.permissions as any;
      if (perms?.[module]?.[action] === true) return next();
      return res.status(403).json({ message: "Access denied" });
    } catch (error) {
      console.error("[auth] permission check failed:", error);
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
};

/**
 * Like requirePermission, but the listed role types always pass too (e.g. HR
 * for interviews, matching the frontend's canCreate/canUpdate checks).
 */
export const requirePermissionOrRoles = (permPath: string, roleTypes: string[]) => {
  const [module, action] = permPath.split(".");
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const role = await loadCallerRole(req);
      if (!role) {
        return res.status(401).json({ message: "Account is no longer active" });
      }
      if (action === "delete" && role.canDelete === false) {
        return res.status(403).json({ message: "Your role is not allowed to delete" });
      }
      if (role.roleType === RoleType.ADMIN || roleTypes.includes(role.roleType)) return next();
      const perms = role.permissions as any;
      if (perms?.[module]?.[action] === true) return next();
      return res.status(403).json({ message: "Access denied" });
    } catch (error) {
      console.error("[auth] permission check failed:", error);
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
};

/** Role-type guard that re-checks the role in the DB (not just the JWT). */
export const requireRoleTypes = (roleTypes: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const role = await loadCallerRole(req);
      if (!role) {
        return res.status(401).json({ message: "Account is no longer active" });
      }
      if (!roleTypes.includes(role.roleType)) {
        return res.status(403).json({ message: "Access denied" });
      }
      next();
    } catch (error) {
      console.error("[auth] role check failed:", error);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
};

/** Admin-only guard that re-checks the role in the DB (not just the JWT). */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = await loadCallerRole(req);
    if (!role) {
      return res.status(401).json({ message: "Account is no longer active" });
    }
    if (role.roleType !== RoleType.ADMIN) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  } catch (error) {
    console.error("[auth] admin check failed:", error);
    res.status(500).json({ message: "Permission check failed" });
  }
};
