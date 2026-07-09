import { Response } from "express";
import { AuthRequest } from "../types";
import { candidateUsecase } from "../usecases/candidate.usecase";

export const candidateController = {
  async getAllCandidates(req: AuthRequest, res: Response) {
    try {
      const result = await candidateUsecase.getAllCandidates(req.query);
      res.json({ success: true, ...result });
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
      const candidate = await candidateUsecase.createCandidate(req.body, req.user?.id);
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
        req.user?.id,
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

  // Async bulk intake: upload to Drive, enqueue a ResumeJob, return 202
  // immediately. The separate worker process does the heavy parsing/creation.
  async bulkUploadResume(req: AuthRequest, res: Response) {
    try {
      const file = (req as any).file;
      if (!file) {
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });
      }
      const { jobId } = await candidateUsecase.enqueueResumeJob(
        file,
        req.user?.id,
      );
      res.status(202).json({ success: true, jobId });
    } catch (error: any) {
      const status = error.message.includes("Invalid file type")
        ? 400
        : error.message.includes("Too many resumes")
          ? 429
          : error.message.includes("credentials not configured")
            ? 400
            : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async getResumeJobs(req: AuthRequest, res: Response) {
    try {
      const jobs = await candidateUsecase.getResumeJobs(
        (req.query.ids as string) || "",
      );
      res.json({ success: true, jobs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
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
