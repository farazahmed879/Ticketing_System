import { Request, Response } from "express";
import { projectRepository } from "../repositories/project.repository";
import { RoleName } from "../utils/constants";

export const projectController = {
  async getAll(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const query: any = { ...req.query };

      const role = user?.role || req.query.role;
      const userId = user?.id || req.query.userId;

      // Client: only projects they are assigned to
      if (role === RoleName.CUSTOMER && userId) {
        query.clientId = userId;
      }

      // Manager: only projects they manage
      if (role === RoleName.AGENT && userId) {
        query.managerId = userId;
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

  async getMembers(req: Request, res: Response) {
    try {
      const project = await projectRepository.findByIdWithMembers(req.params.id as string);
      if (!project) return res.status(404).json({ success: false, error: "Project not found" });

      const membersMap = new Map<string, any>();
      project.teams.forEach((team: any) => {
        team.members.forEach((member: any) => {
          if (!membersMap.has(member.id)) {
            membersMap.set(member.id, { ...member, teamNames: [team.name] });
          } else {
            const existing = membersMap.get(member.id);
            if (!existing.teamNames.includes(team.name)) {
              existing.teamNames.push(team.name);
            }
          }
        });
      });
      
      const members = Array.from(membersMap.values());
      res.json({ success: true, members });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};
