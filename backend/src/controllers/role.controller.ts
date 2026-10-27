import { Response } from "express";
import { AuthRequest } from "../types";
import { roleUsecase } from "../usecases/role.usecase";

export const roleController = {
  async getRoles(req: AuthRequest, res: Response) {
    try {
      const { limit, page } = req.query;
      const { roles, total } = await roleUsecase.getRoles(
        limit as string,
        page as string,
      );
      res.json({ success: true, roles, total });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createRole(req: AuthRequest, res: Response) {
    try {
      const role = await roleUsecase.createRole(req.body);
      res.status(201).json({ success: true, role });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateRole(req: AuthRequest, res: Response) {
    try {
      const role = await roleUsecase.updateRole(
        req.params.id as string,
        req.body,
      );
      res.json({ success: true, role });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteRole(req: AuthRequest, res: Response) {
    try {
      await roleUsecase.deleteRole(req.params.id as string);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      const status = error.message.includes("Cannot delete") ? 400 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },
};
