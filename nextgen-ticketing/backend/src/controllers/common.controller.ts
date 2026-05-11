import { Request, Response } from "express";
import { AuthRequest } from "../types";
import { commonUsecase } from "../usecases/common.usecase";

export const commonController = {
  async getStatuses(req: Request, res: Response) {
    try {
      const statuses = await commonUsecase.getStatuses();
      res.json({ success: true, statuses });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getPriorities(req: Request, res: Response) {
    try {
      const priorities = await commonUsecase.getPriorities();
      res.json({ success: true, priorities });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTypes(req: Request, res: Response) {
    try {
      const types = await commonUsecase.getTypes();
      res.json({ success: true, types });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getRoles(req: Request, res: Response) {
    try {
      const roles = await commonUsecase.getRoles();
      res.json({ success: true, roles });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getGroups(req: AuthRequest, res: Response) {
    try {
      const limit = req.query.limit as string;
      const page = req.query.page as string;
      const type = (req.query.type as string) || "all";
      const userId = req.user?.id;

      const groups = await commonUsecase.getGroups(limit, page, type, userId);
      res.json({ success: true, groups, count: groups.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createGroup(req: AuthRequest, res: Response) {
    try {
      const group = await commonUsecase.createGroup(req.body);
      res.status(201).json({ success: true, group });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateGroup(req: AuthRequest, res: Response) {
    try {
      const group = await commonUsecase.updateGroup(
        req.params.id as string,
        req.body,
      );
      res.json({ success: true, group });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteGroup(req: AuthRequest, res: Response) {
    try {
      await commonUsecase.deleteGroup(req.params.id as string);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      const status = error.message.includes("Unable to delete") ? 400 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const result = await commonUsecase.getDashboardStats(req.user);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
