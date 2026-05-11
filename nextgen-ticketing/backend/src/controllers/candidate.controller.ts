import { Response } from "express";
import { AuthRequest } from "../types";
import { candidateUsecase } from "../usecases/candidate.usecase";

export const candidateController = {
  async getAllCandidates(req: AuthRequest, res: Response) {
    try {
      const { candidates, total } = await candidateUsecase.getAllCandidates(
        req.query,
      );
      res.json({ success: true, candidates, total });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getCandidateById(req: AuthRequest, res: Response) {
    try {
      const candidate = await candidateUsecase.getCandidateById(
        req.params.id as string,
      );
      res.json({ success: true, candidate });
    } catch (error: any) {
      const status = error.message === "Candidate not found" ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async createCandidate(req: AuthRequest, res: Response) {
    try {
      const candidate = await candidateUsecase.createCandidate(req.body);
      res.status(201).json({ success: true, candidate });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          error: "A candidate with this email already exists",
        });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateCandidate(req: AuthRequest, res: Response) {
    try {
      const candidate = await candidateUsecase.updateCandidate(
        req.params.id as string,
        req.body,
      );
      res.json({ success: true, candidate });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          error: "A candidate with this email already exists",
        });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteCandidate(req: AuthRequest, res: Response) {
    try {
      await candidateUsecase.deleteCandidate(req.params.id as string);
      res.json({ success: true, message: "Candidate deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async uploadResume(req: AuthRequest, res: Response) {
    try {
      const file = (req as any).file;
      if (!file) {
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });
      }

      const { driveUrl, parsedData } =
        await candidateUsecase.uploadResume(file);
      res.json({ success: true, driveUrl, parsedData });
    } catch (error: any) {
      const status =
        error.message.includes("Invalid file type") ||
        error.message.includes("credentials not configured")
          ? 400
          : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async convertToUser(req: AuthRequest, res: Response) {
    try {
      const result = await candidateUsecase.convertToUser(
        req.params.id as string,
      );
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLeaderboard(req: AuthRequest, res: Response) {
    try {
      const leaderboard = await candidateUsecase.getLeaderboard();
      res.json({ success: true, leaderboard });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
