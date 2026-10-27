import { timesheetRepository } from "../repositories/timesheet.repository";
import { startOfMonth, endOfMonth, startOfDay, startOfYear, endOfYear } from "date-fns";
import prisma from "../prisma";

const ENTRY_TYPES = new Set([
  "WORK",
  "ONSITE_OFFICE",
  "ONSITE_CLIENT",
  "WORK_FROM_HOME",
  "WEEKEND",
  "PUBLIC_HOLIDAY",
  "HALF_DAY_LEAVE",
  "FULL_DAY_LEAVE",
]);

// Entry types that carry no work hours/tasks — enforced to zero server-side.
// HALF_DAY_LEAVE is intentionally excluded: it still requires the worked
// half-day's hours/tasks to be logged.
const ZERO_HOUR_ENTRY_TYPES = new Set(["WEEKEND", "PUBLIC_HOLIDAY", "FULL_DAY_LEAVE"]);

// Entry types that consume days from the employee's leave balance, and how many.
const LEAVE_DAYS_BY_ENTRY_TYPE: Record<string, number> = {
  HALF_DAY_LEAVE: 0.5,
  FULL_DAY_LEAVE: 1,
};

export const timesheetUsecase = {
  async getEntries(startDate?: string, endDate?: string, userId?: string) {
    const where: any = { userId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return timesheetRepository.findEntries(where);
  },

  async upsertEntry(
    userId: string,
    date: string,
    totalHours: string,
    notes: string,
    tasks: any[],
    entryType: string = "WORK",
  ) {
    if (!ENTRY_TYPES.has(entryType)) {
      throw new Error("Invalid entry type.");
    }

    const entryDate = startOfDay(new Date(date));

    const existingEntry = await timesheetRepository.findEntryByUserIdAndDate(userId, entryDate);

    if (
      existingEntry &&
      (existingEntry.managerApproved === "APPROVED" || existingEntry.hrApproved === "APPROVED")
    ) {
      throw new Error("Cannot edit an approved timesheet.");
    }

    // Weekend / Public Holiday / Full Day Leave days have no work hours or
    // tasks — enforce this server-side regardless of what the client sends.
    const isZeroHourDay = ZERO_HOUR_ENTRY_TYPES.has(entryType);
    const finalTasks = isZeroHourDay ? [] : tasks;
    const finalHours = isZeroHourDay ? 0 : parseFloat(totalHours);

    const entry = await timesheetRepository.upsertEntryWithTasks(
      userId,
      entryDate,
      { totalHours: finalHours, notes, entryType },
      finalTasks
    );

    return timesheetRepository.findEntryById(entry.id);
  },

  async approveEntry(id: string, agentId: string, roleType: string) {
    const isHr = roleType === "hr";
    const data: any = {};

    if (isHr) {
      data.hrApproved = "APPROVED";
    } else {
      data.managerApproved = "APPROVED";
    }

    if (isHr) {
      const existing = await timesheetRepository.findEntryById(id);
      const days = existing ? LEAVE_DAYS_BY_ENTRY_TYPE[existing.entryType || ""] : undefined;
      if (existing && days && existing.hrApproved !== "APPROVED") {
        const user = await prisma.user.findUnique({
          where: { id: existing.userId },
          select: { leaves: true },
        });
        const currentBalance = user?.leaves ?? 0;
        if (currentBalance < days) {
          throw new Error(
            `Insufficient leave balance. Requested ${days} day(s), available ${currentBalance}.`,
          );
        }
        await prisma.user.update({
          where: { id: existing.userId },
          data: { leaves: { decrement: days } },
        });
      }
    }

    return timesheetRepository.updateEntryStatus(id, data);
  },

  async rejectEntry(id: string, reason?: string, roleType?: string) {
    const isHr = roleType === "hr";
    const data: any = {
      notes: reason ? `REJECTED: ${reason}` : undefined,
    };
    if (isHr) {
      data.hrApproved = "REJECTED";
    } else {
      data.managerApproved = "REJECTED";
    }

    if (isHr) {
      const existing = await timesheetRepository.findEntryById(id);
      const days = existing ? LEAVE_DAYS_BY_ENTRY_TYPE[existing.entryType || ""] : undefined;
      if (existing && days && existing.hrApproved === "APPROVED") {
        await prisma.user.update({
          where: { id: existing.userId },
          data: { leaves: { increment: days } },
        });
      }
    }

    return timesheetRepository.updateEntryStatus(id, data);
  },

  async getPendingEntries() {
    return timesheetRepository.findPendingEntries();
  },

  async getMonthlyReport(monthStr: string, yearStr: string, userId: string) {
    const m = parseInt(monthStr) || new Date().getMonth();
    const y = parseInt(yearStr) || new Date().getFullYear();

    const startDate = startOfMonth(new Date(y, m));
    const endDate = endOfMonth(new Date(y, m));

    const entries = await timesheetRepository.findEntriesForReport(userId, startDate, endDate);

    const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
    const approvedHours = entries
      .filter((e) => e.hrApproved === "APPROVED")
      .reduce((sum, e) => sum + e.totalHours, 0);

    const projectBreakdown: Record<string, { name: string; hours: number }> = {};
    entries.forEach((e) => {
      e.tasks.forEach((t) => {
        const pId = t.projectId || "unassigned";
        const pName = (t as any).project?.name || "Unassigned";
        if (!projectBreakdown[pId]) {
          projectBreakdown[pId] = { name: pName, hours: 0 };
        }
        projectBreakdown[pId].hours += t.hours;
      });
    });

    return {
      totalHours,
      approvedHours,
      daysCount: entries.length,
      projectBreakdown: Object.values(projectBreakdown),
      entries,
    };
  },
  async getReviewEntries(filters: { status?: string; userId?: string; month?: string; year?: string; roleType?: string }) {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (filters.year !== undefined) {
      const y = parseInt(filters.year);
      if (filters.month !== undefined) {
        const m = parseInt(filters.month);
        startDate = startOfMonth(new Date(y, m));
        endDate = endOfMonth(new Date(y, m));
      } else {
        // "All Months" with a specific year → filter the whole year.
        startDate = startOfYear(new Date(y, 0));
        endDate = endOfYear(new Date(y, 0));
      }
    }

    return timesheetRepository.findReviewEntries({
      ...filters,
      startDate,
      endDate,
    });
  },
  
  async getPendingCounts(month?: string, year?: string, roleType?: string) {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (year !== undefined) {
      const y = parseInt(year);
      if (month !== undefined) {
        const m = parseInt(month);
        startDate = startOfMonth(new Date(y, m));
        endDate = endOfMonth(new Date(y, m));
      } else {
        startDate = startOfYear(new Date(y, 0));
        endDate = endOfYear(new Date(y, 0));
      }
    }

    return timesheetRepository.getPendingCounts(startDate, endDate, roleType);
  },
};
