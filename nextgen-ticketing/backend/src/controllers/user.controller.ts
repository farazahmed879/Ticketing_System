import { Response } from "express";
import { AuthRequest } from "../types";
import { userUsecase } from "../usecases/user.usecase";
import { RoleType } from "../utils/constants";

export const userController = {
  async getUsers(req: AuthRequest, res: Response) {
    try {
      const {
        type = "ALL",
        limit = "10",
        page = "0",
        showDeleted = "false",
        search = "",
      } = req.query;
      const { accounts, total } = await userUsecase.getUsers(
        type as string,
        limit as string,
        page as string,
        showDeleted as string,
        search as string,
      );
      res.json({ success: true, accounts, total, count: accounts.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  async getUsersByRoles(req: AuthRequest, res: Response) {
    try {
      const {
        limit = "10",
        page = "0",
        showDeleted = "false",
        search = "",
      } = req.query;

      // Handle both 'roles' and 'roles[]' from query
      let roles = req.query.roles || req.query["roles[]"] || ["ALL"];

      // Ensure roles is an array
      if (!Array.isArray(roles)) {
        roles = [roles as string];
      }

      const { accounts, total } = await userUsecase.getUsersByRoles(
        roles as string[],
        limit as string,
        page as string,
        showDeleted as string,
        search as string,
      );
      res.json({ success: true, accounts, total, count: accounts.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getUserById(req: AuthRequest, res: Response) {
    try {
      const account = await userUsecase.getUserById(req.params.id as string);
      res.json({ success: true, account });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  },

  async createUser(req: AuthRequest, res: Response) {
    try {
      const account = await userUsecase.createUser(req.body);
      res.status(201).json({ success: true, account });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateUser(req: AuthRequest, res: Response) {
    try {
      const callerRole = (req as any).user?.role as string | undefined;

      if (
        callerRole !== RoleType.ADMIN &&
        callerRole !== RoleType.HR
      ) {
        return res.status(403).json({
          success: false,
          error: "Only Admins and HR can edit user profiles.",
        });
      }
      const user = await userUsecase.updateUser(
        req.params.id as string,
        req.body,
      );
      res.json({ success: true, user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteUser(req: AuthRequest, res: Response) {
    try {
      await userUsecase.deleteUser(req.params.id as string);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await userUsecase.updateProfile(userId, req.body);
      res.json({ success: true, user });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updatePassword(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { currentPassword, newPassword } = req.body;
      await userUsecase.updatePassword(userId, currentPassword, newPassword);
      res.json({ success: true });
    } catch (error: any) {
      const status = error.message.includes("incorrect") ? 400 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async updatePhoneNumber(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { currentPhone, newPhone } = req.body;
      await userUsecase.updatePhoneNumber(userId, currentPhone, newPhone);
      res.json({ success: true });
    } catch (error: any) {
      const status = error.message.includes("incorrect") ? 400 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },
};
