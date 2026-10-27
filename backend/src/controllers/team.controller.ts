import { Response } from "express";
import { AuthRequest } from "../types";
import { teamUsecase } from "../usecases/team.usecase";

export const teamController = {
  async getMyTeam(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });
      const data = await teamUsecase.getMyTeam(userId);
      res.json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTeams(req: AuthRequest, res: Response) {
    try {
      const limit = req.query.limit as string;
      const page = req.query.page as string;
      const search = req.query.search as string | undefined;
      const teams = await teamUsecase.getTeams(limit, page, search);
      res.json({ success: true, teams, count: teams.length });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTeam(req: AuthRequest, res: Response) {
    try {
      const team = await teamUsecase.getTeamById(req.params.id as string);
      res.json({ success: true, team });
    } catch (error: any) {
      const status = error.message === "Team not found" ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async createTeam(req: AuthRequest, res: Response) {
    try {
      const team = await teamUsecase.createTeam(req.body);
      res.status(201).json({ success: true, team });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return res.status(409).json({
          success: false,
          error: `A team named "${req.body.name}" already exists. Please choose a different name.`,
        });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateTeam(req: AuthRequest, res: Response) {
    try {
      const team = await teamUsecase.updateTeam(
        req.params.id as string,
        req.body,
      );
      res.json({ success: true, team });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return res.status(409).json({
          success: false,
          error: `A team named "${req.body.name}" already exists. Please choose a different name.`,
        });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteTeam(req: AuthRequest, res: Response) {
    try {
      await teamUsecase.deleteTeam(req.params.id as string);
      res.json({ success: true, id: req.params.id });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
