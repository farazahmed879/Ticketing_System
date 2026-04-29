import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { timesheetUsecase } from "../usecases/timesheet.usecase";

export const timesheetController = {
  async getEntries(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, userId } = req.query;
      const targetUserId =
        (typeof userId === "string" ? userId : undefined) || req.user?.id;

      if (!targetUserId)
        return res.status(401).json({ message: "Unauthorized" });

      const entries = await timesheetUsecase.getEntries(
        startDate as string,
        endDate as string,
        targetUserId
      );
      res.json({ success: true, entries });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async upsertEntry(req: AuthRequest, res: Response) {
    try {
      const { date, totalHours, notes, tasks } = req.body;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const entry = await timesheetUsecase.upsertEntry(
        userId,
        date,
        totalHours,
        notes,
        tasks
      );
      res.json({ success: true, entry });
    } catch (error: any) {
      const status = error.message.includes("Cannot edit") ? 403 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async approveEntry(req: AuthRequest, res: Response) {
    try {
      const agentId = req.user?.id;
      if (!agentId) return res.status(401).json({ message: "Unauthorized" });

      const entry = await timesheetUsecase.approveEntry(
        req.params.id as string,
        agentId
      );
      res.json({ success: true, entry });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async rejectEntry(req: AuthRequest, res: Response) {
    try {
      const agentId = req.user?.id;
      if (!agentId) return res.status(401).json({ message: "Unauthorized" });

      const { reason } = req.body;
      const entry = await timesheetUsecase.rejectEntry(
        req.params.id as string,
        reason
      );
      res.json({ success: true, entry });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getPendingEntries(req: AuthRequest, res: Response) {
    try {
      const entries = await timesheetUsecase.getPendingEntries();
      res.json({ success: true, entries });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getMonthlyReport(req: AuthRequest, res: Response) {
    try {
      const { month, year, userId } = req.query;
      const targetUserId =
        (typeof userId === "string" ? userId : undefined) || req.user?.id;

      if (!targetUserId)
        return res.status(401).json({ message: "Unauthorized" });

      const report = await timesheetUsecase.getMonthlyReport(
        month as string,
        year as string,
        targetUserId
      );

      res.json({ success: true, report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
