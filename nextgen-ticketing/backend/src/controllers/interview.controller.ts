import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { interviewUsecase } from "../usecases/interview.usecase";
import { emitNotificationToUser } from "../socketio/events";

export const interviewController = {
  async getAllInterviews(req: AuthRequest, res: Response) {
    try {
      const { interviews, total } = await interviewUsecase.getAllInterviews(
        req.query,
        req.user
      );
      res.json({ success: true, interviews, total });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getInterviewById(req: AuthRequest, res: Response) {
    try {
      const interview = await interviewUsecase.getInterviewById(
        req.params.id as string,
        req.user
      );
      res.json({ success: true, interview });
    } catch (error: any) {
      const status =
        error.message === "Interview not found"
          ? 404
          : error.message.includes("Access denied")
          ? 403
          : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async createInterview(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { interview, notifications } = await interviewUsecase.createInterview(
        req.body,
        user
      );

      const io = req.app.get("io");
      if (io) {
        for (const n of notifications) {
          emitNotificationToUser(io, n.userId, n.notification);
        }
      }

      res.status(201).json({ success: true, interview });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateInterview(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const interview = await interviewUsecase.updateInterview(
        req.params.id as string,
        req.body,
        user
      );
      res.json({ success: true, interview });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateInterviewStatus(req: AuthRequest, res: Response) {
    try {
      const interview = await interviewUsecase.updateInterviewStatus(
        req.params.id as string,
        req.body.status
      );
      res.json({ success: true, interview });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async deleteInterview(req: AuthRequest, res: Response) {
    try {
      await interviewUsecase.deleteInterview(req.params.id as string);
      res.json({ success: true, message: "Interview deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async submitFeedback(req: AuthRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const feedback = await interviewUsecase.submitFeedback(
        req.params.id as string,
        req.body,
        user
      );
      res.json({ success: true, feedback });
    } catch (error: any) {
      const status = error.message.includes("panel member") ? 403 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },
};
