import { Response } from "express";
import { AuthRequest } from "../types";
import { timesheetUsecase } from "../usecases/timesheet.usecase";
import { RoleType } from "../utils/constants";
import { leaveUsecase } from "../usecases/leave.usecase";
import { emitNotificationToUser } from "../socketio/events";

// HR approving / un-approving a leave day moves the employee's leave balance;
// tell them how much and what's left. Best-effort: never fails the review.
async function notifyLeaveChange(
  req: AuthRequest,
  result: { leaveChange: number; userId?: string; entryType?: string | null; date?: Date; entry: any },
) {
  if (!result.leaveChange || !result.userId) return;
  try {
    const day = result.date
      ? ` for ${new Date(result.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : "";
    const notification = await leaveUsecase.notifyBalanceChange(
      result.userId,
      result.leaveChange,
      `${leaveUsecase.labelFor(result.entryType).toLowerCase()}${day}`,
      { timesheetEntryId: result.entry?.id },
    );
    const io = req.app.get("io");
    if (io) emitNotificationToUser(io, result.userId, notification);
  } catch (err) {
    console.error("Failed to send leave notification", err);
  }
}

// Timesheet reviewers (same set as the approval routes) may read anyone's
// entries/report; everyone else is pinned to their own, whatever ?userId= says.
const REVIEW_ROLES: string[] = [RoleType.AGENT, RoleType.ADMIN, RoleType.HR];
const resolveTargetUserId = (req: AuthRequest, userId: unknown) => {
  const self = req.user?.id;
  if (typeof userId !== "string" || !userId || userId === self) return self;
  return REVIEW_ROLES.includes(req.user?.role ?? "") ? userId : self;
};

export const timesheetController = {
  async getEntries(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, userId } = req.query;
      const targetUserId = resolveTargetUserId(req, userId);

      if (!targetUserId)
        return res.status(401).json({ message: "Unauthorized" });

      // Make sure approved leave shows up in the timesheet even if it was
      // approved before auto-fill existed. Best-effort; never blocks the read.
      try {
        await leaveUsecase.syncApprovedLeavesToTimesheet(targetUserId);
      } catch (err) {
        console.error("Failed to sync approved leaves into timesheet", err);
      }

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
      const { date, totalHours, notes, tasks, entryType } = req.body;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const entry = await timesheetUsecase.upsertEntry(
        userId,
        date,
        totalHours,
        notes,
        tasks,
        entryType,
      );
      res.json({ success: true, entry });
    } catch (error: any) {
      const status = error.message.includes("Cannot edit")
        ? 403
        : error.message.includes("Invalid entry type")
          ? 400
          : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async approveEntry(req: AuthRequest, res: Response) {
    try {
      const agentId = req.user?.id;
      const roleType = req.user?.role;
      if (!agentId || !roleType) return res.status(401).json({ message: "Unauthorized" });

      await timesheetUsecase.assertCanReviewLeave(req.params.id as string, { id: agentId, role: roleType });
      const result = await timesheetUsecase.approveEntry(
        req.params.id as string,
        agentId,
        roleType
      );
      await notifyLeaveChange(req, result);
      res.json({ success: true, entry: result.entry });
    } catch (error: any) {
      const status = error.message.includes("Insufficient leave balance")
        ? 400
        : error.message.includes("review your own") || error.message.startsWith("Access denied")
          ? 403
          : error.message === "Timesheet entry not found"
            ? 404
            : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async rejectEntry(req: AuthRequest, res: Response) {
    try {
      const agentId = req.user?.id;
      if (!agentId) return res.status(401).json({ message: "Unauthorized" });

      const { reason } = req.body;
      const roleType = req.user?.role;
      await timesheetUsecase.assertCanReviewLeave(req.params.id as string, { id: agentId, role: roleType as string });
      const result = await timesheetUsecase.rejectEntry(
        req.params.id as string,
        reason,
        roleType as string,
        agentId,
      );
      await notifyLeaveChange(req, result);
      res.json({ success: true, entry: result.entry });
    } catch (error: any) {
      const status = error.message.includes("Insufficient leave balance")
        ? 400
        : error.message.includes("review your own") || error.message.startsWith("Access denied")
          ? 403
          : error.message === "Timesheet entry not found"
            ? 404
            : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },

  async getPendingEntries(req: AuthRequest, res: Response) {
    try {
      const { status, userId, month, year, from, to } = req.query;
      const roleType = req.user?.role;
      const entries = await timesheetUsecase.getReviewEntries({
        status: status as string,
        userId: userId as string,
        month: month as string,
        year: year as string,
        from: from as string,
        to: to as string,
        roleType: roleType as string,
        excludeUserId: req.user?.id,
      });
      // Flag leave entries this reviewer can't approve (leave hierarchy).
      const annotated = req.user
        ? await timesheetUsecase.annotateLeaveReview(entries, { id: req.user.id, role: req.user.role })
        : entries;
      res.json({ success: true, entries: annotated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getMonthlyReport(req: AuthRequest, res: Response) {
    try {
      const { month, year, userId } = req.query;
      const targetUserId = resolveTargetUserId(req, userId);

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
      const { month, year, from, to } = req.query;
      const roleType = req.user?.role;
      const counts = await timesheetUsecase.getPendingCounts(
        month as string,
        year as string,
        roleType as string,
        req.user?.id,
        from as string,
        to as string,
      );
      res.json({ success: true, counts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getUnfilledUsers(req: AuthRequest, res: Response) {
    try {
      const { month, year, from, to } = req.query;
      const data = await timesheetUsecase.getUnfilledUsers(
        month as string,
        year as string,
        from as string,
        to as string,
      );
      res.json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
