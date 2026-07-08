import { Response } from "express";
import { AuthRequest } from "../types";
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
        targetUserId,
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
        tasks,
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
      const roleType = req.user?.role;
      if (!agentId || !roleType) return res.status(401).json({ message: "Unauthorized" });

      const entry = await timesheetUsecase.approveEntry(
        req.params.id as string,
        agentId,
        roleType
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
      const roleType = req.user?.role;
      const entry = await timesheetUsecase.rejectEntry(
        req.params.id as string,
        reason,
        roleType as string
      );
      res.json({ success: true, entry });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getPendingEntries(req: AuthRequest, res: Response) {
    try {
      const { status, userId, month, year } = req.query;
      const roleType = req.user?.role;
      const entries = await timesheetUsecase.getReviewEntries({
        status: status as string,
        userId: userId as string,
        month: month as string,
        year: year as string,
        roleType: roleType as string,
      });
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
        targetUserId,
      );

      res.json({ success: true, report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getPendingCounts(req: AuthRequest, res: Response) {
    try {
      const { month, year } = req.query;
      const roleType = req.user?.role;
      const counts = await timesheetUsecase.getPendingCounts(
        month as string,
        year as string,
        roleType as string
      );
      res.json({ success: true, counts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
