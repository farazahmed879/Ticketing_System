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

  /** Self-review is blocked: a reviewer must not approve/reject their own entry. */
  async assertNotOwnEntry(id: string, reviewerId: string) {
    const entry = await timesheetRepository.findEntryById(id);
    if (!entry) throw new Error("Timesheet entry not found");
    if (entry.userId === reviewerId) {
      throw new Error("You can't review your own timesheet entry. Another reviewer must approve it.");
    }
  },

  async approveEntry(id: string, agentId: string, roleType: string) {
    await this.assertNotOwnEntry(id, agentId);
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
      if (existing && days) {
        // Race-safe leave deduction without a transaction. The old code read
        // the status and balance, then wrote — two concurrent approvals both
        // passed the checks and deducted twice.
        //
        // 1. Atomically claim the "not approved -> APPROVED" transition. Only
        //    one concurrent approver can win; an already-approved entry is a
        //    no-op (no second deduction).
        const claimed = await prisma.timesheetEntry.updateMany({
          where: {
            id,
            OR: [
              { hrApproved: { not: "APPROVED" } },
              { hrApproved: { isSet: false } },
            ],
          },
          data: { hrApproved: "APPROVED" },
        });

        if (claimed.count === 1) {
          // 2. Deduct only if the balance covers it, in the same write.
          const debited = await prisma.user.updateMany({
            where: { id: existing.userId, leaves: { gte: days } },
            data: { leaves: { decrement: days } },
          });
          if (debited.count === 0) {
            // 3. Not enough balance: undo the claim and report.
            await prisma.timesheetEntry.update({
              where: { id },
              data: { hrApproved: existing.hrApproved ?? "PENDING" },
            });
            const user = await prisma.user.findUnique({
              where: { id: existing.userId },
              select: { leaves: true },
            });
            throw new Error(
              `Insufficient leave balance. Requested ${days} day(s), available ${user?.leaves ?? 0}.`,
            );
          }
        }
      }
    }

    return timesheetRepository.updateEntryStatus(id, data);
  },

  async rejectEntry(id: string, reason?: string, roleType?: string, reviewerId?: string) {
    if (!reviewerId) throw new Error("Unauthorized");
    await this.assertNotOwnEntry(id, reviewerId);
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
      if (existing && days) {
        // Refund only if THIS call flips APPROVED -> REJECTED, so concurrent
        // rejections can't refund the same leave twice.
        const unapproved = await prisma.timesheetEntry.updateMany({
          where: { id, hrApproved: "APPROVED" },
          data: { hrApproved: "REJECTED" },
        });
        if (unapproved.count === 1) {
          await prisma.user.update({
            where: { id: existing.userId },
            data: { leaves: { increment: days } },
          });
        }
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
  async getReviewEntries(filters: { status?: string; userId?: string; month?: string; year?: string; roleType?: string; excludeUserId?: string }) {
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
  
  async getPendingCounts(month?: string, year?: string, roleType?: string, excludeUserId?: string) {
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

    return timesheetRepository.getPendingCounts(startDate, endDate, roleType, excludeUserId);
  },

  async getUnfilledUsers(month?: string, year?: string) {
    // Policy rule: starts from first November 2026 (2026-11-01)
    const POLICY_START = startOfDay(new Date(2026, 10, 1));
    const now = new Date();
    const today = startOfDay(now);

    let startDate = POLICY_START;
    let endDate = today;

    if (year !== undefined && month !== undefined && month !== "all" && year !== "all") {
      const y = parseInt(year);
      const m = parseInt(month);
      const monthStart = startOfMonth(new Date(y, m));
      const monthEnd = endOfMonth(new Date(y, m));

      startDate = monthStart < POLICY_START ? POLICY_START : monthStart;
      endDate = monthEnd > today ? today : monthEnd;
    }

    if (startDate > endDate) {
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        totalWorkingDays: 0,
        unfilledUserIds: [],
        userMissingDays: {},
      };
    }

    // Collect Mon-Fri working days in range (YYYY-MM-DD)
    const workingDays: string[] = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dayOfWeek = cur.getDay(); // 0 = Sun, 6 = Sat
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        workingDays.push(`${y}-${m}-${d}`);
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (workingDays.length === 0) {
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        totalWorkingDays: 0,
        unfilledUserIds: [],
        userMissingDays: {},
      };
    }

    // Non-deleted users
    const users = await prisma.user.findMany({
      where: { deleted: false },
      select: { id: true },
    });

    // Timesheet entries in the date range (buffer +- 1 day for any timezone offset)
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        date: {
          gte: new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
          lte: new Date(endDate.getTime() + 48 * 60 * 60 * 1000),
        },
      },
      select: {
        userId: true,
        date: true,
      },
    });

    const userFilledDates = new Map<string, Set<string>>();
    entries.forEach((e) => {
      if (!userFilledDates.has(e.userId)) {
        userFilledDates.set(e.userId, new Set());
      }
      const set = userFilledDates.get(e.userId)!;
      const dt = new Date(e.date);
      set.add(dt.toISOString().split("T")[0]);
      const ly = dt.getFullYear();
      const lm = String(dt.getMonth() + 1).padStart(2, "0");
      const ld = String(dt.getDate()).padStart(2, "0");
      set.add(`${ly}-${lm}-${ld}`);
    });

    const unfilledUserIds: string[] = [];
    const userMissingDays: Record<string, { count: number; missingDates: string[] }> = {};

    users.forEach((u) => {
      const filledSet = userFilledDates.get(u.id) || new Set();
      const missingDates = workingDays.filter((wd) => !filledSet.has(wd));

      if (missingDates.length > 0) {
        unfilledUserIds.push(u.id);
        userMissingDays[u.id] = {
          count: missingDates.length,
          missingDates,
        };
      }
    });

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      totalWorkingDays: workingDays.length,
      unfilledUserIds,
      userMissingDays,
    };
  },
};
