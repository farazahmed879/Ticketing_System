import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { StatusName, RoleName, ActionName } from "../utils/constants";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

const prisma = new PrismaClient();

// Get timesheet entries for a date range
export const getEntries = async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, userId } = req.query;
  const targetUserId = (typeof userId === 'string' ? userId : undefined) || req.user?.id;

  if (!targetUserId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const where: any = {
      userId: targetUserId,
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const entries = await prisma.timesheetEntry.findMany({
      where,
      include: {
        tasks: {
          include: {
            project: { select: { id: true, name: true } },
            ticket: { select: { id: true, uid: true, subject: true } },
          },
        },
        approvedBy: { select: { id: true, fullname: true } },
      },
      orderBy: { date: "asc" },
    });

    res.json({ success: true, entries });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Upsert a timesheet entry (day)
export const upsertEntry = async (req: AuthRequest, res: Response) => {
  const { date, totalHours, notes, tasks } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const entryDate = startOfDay(new Date(date));

    // Check if entry exists and its status
    const existingEntry = await prisma.timesheetEntry.findUnique({
      where: {
        userId_date: {
          userId,
          date: entryDate,
        },
      },
    });

    if (existingEntry && existingEntry.status === StatusName.APPROVED) {
      return res.status(403).json({
        success: false,
        error: "Cannot edit an approved timesheet.",
      });
    }

    // Use a transaction to ensure atomic update of entry and tasks
    const entry = await prisma.$transaction(async (tx) => {
      // 1. Delete existing tasks if updating
      if (existingEntry) {
        await tx.timesheetTask.deleteMany({
          where: { entryId: existingEntry.id },
        });
      }

      // 2. Upsert the entry
      const upsertedEntry = await tx.timesheetEntry.upsert({
        where: {
          userId_date: {
            userId,
            date: entryDate,
          },
        },
        update: {
          totalHours: parseFloat(totalHours),
          notes,
          status: StatusName.PENDING, // Reset to pending on edit
        },
        create: {
          userId,
          date: entryDate,
          totalHours: parseFloat(totalHours),
          notes,
          status: StatusName.PENDING,
        },
      });

      // 3. Create new tasks
      if (tasks && tasks.length > 0) {
        await tx.timesheetTask.createMany({
          data: tasks.map((t: any) => ({
            description: t.description,
            hours: parseFloat(t.hours),
            projectId: t.projectId || null,
            ticketId: t.ticketId || null,
            entryId: upsertedEntry.id,
          })),
        });

        // 4. Auto-create comments on tickets if linked
        for (const task of tasks) {
          if (task.ticketId) {
            await tx.comment.create({
              data: {
                comment: `[Timesheet Task] ${task.description} (${task.hours} hrs)`,
                isNote: true, // Internal note
                authorId: userId,
                ticketId: task.ticketId,
              },
            });
          }
        }
      }

      return upsertedEntry;
    });

    const fullEntry = await prisma.timesheetEntry.findUnique({
      where: { id: entry.id },
      include: { tasks: true },
    });

    res.json({ success: true, entry: fullEntry });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Approve a timesheet entry
export const approveEntry = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const agentId = req.user?.id;

  if (!agentId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const entry = await prisma.timesheetEntry.update({
      where: { id: id as string },
      data: {
        status: StatusName.APPROVED,
        approvedById: agentId,
      },
    });

    res.json({ success: true, entry });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Reject a timesheet entry
export const rejectEntry = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const agentId = req.user?.id;

  if (!agentId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const entry = await prisma.timesheetEntry.update({
      where: { id: id as string },
      data: {
        status: StatusName.REJECTED,
        notes: reason ? `REJECTED: ${reason}` : undefined,
      },
    });

    res.json({ success: true, entry });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get pending entries for approval (Agents/Admins)
export const getPendingEntries = async (req: AuthRequest, res: Response) => {
  try {
    const entries = await prisma.timesheetEntry.findMany({
      where: { status: StatusName.PENDING },
      include: {
        user: { select: { id: true, fullname: true, email: true } },
        tasks: {
          include: {
            project: { select: { name: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    res.json({ success: true, entries });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Monthly Report
export const getMonthlyReport = async (req: AuthRequest, res: Response) => {
  const { month, year, userId } = req.query;
  const targetUserId = (typeof userId === 'string' ? userId : undefined) || req.user?.id;

  if (!targetUserId) return res.status(401).json({ message: "Unauthorized" });

  const m = parseInt(month as string) || new Date().getMonth();
  const y = parseInt(year as string) || new Date().getFullYear();

  const startDate = startOfMonth(new Date(y, m));
  const endDate = endOfMonth(new Date(y, m));

  try {
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        userId: targetUserId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        tasks: {
          include: { project: true },
        },
      },
    });

    // Calculate stats
    const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
    const approvedHours = entries
      .filter((e) => e.status === StatusName.APPROVED)
      .reduce((sum, e) => sum + e.totalHours, 0);
    
    const projectBreakdown: Record<string, { name: string; hours: number }> = {};
    entries.forEach((e) => {
      e.tasks.forEach((t) => {
        const pId = t.projectId || "unassigned";
        const pName = t.project?.name || "Unassigned";
        if (!projectBreakdown[pId]) {
          projectBreakdown[pId] = { name: pName, hours: 0 };
        }
        projectBreakdown[pId].hours += t.hours;
      });
    });

    res.json({
      success: true,
      report: {
        totalHours,
        approvedHours,
        daysCount: entries.length,
        projectBreakdown: Object.values(projectBreakdown),
        entries,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
