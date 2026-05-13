import { Request, Response } from "express";
import { projectRepository } from "../repositories/project.repository";
import { RoleName } from "../utils/constants";

export const projectController = {
  async getAll(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const query: any = { ...req.query };

      // Filter projects for Client role
      const role = user?.role || req.query.role;
      const userId = user?.id || req.query.userId;

      if (role === RoleName.CUSTOMER && userId) {
        query.clientId = userId;
      }

      const projects = await projectRepository.findMany(query);
      res.json({ success: true, projects });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const project = await projectRepository.findById(req.params.id as string);
      if (!project)
        return res
          .status(404)
          .json({ success: false, error: "Project not found" });
      res.json({ success: true, project });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const project = await projectRepository.create(req.body);
      res.status(201).json({ success: true, project });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const project = await projectRepository.update(
        req.params.id as string,
        req.body,
      );
      res.json({ success: true, project });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await projectRepository.delete(req.params.id as string);
      res.json({ success: true, message: "Project deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};
