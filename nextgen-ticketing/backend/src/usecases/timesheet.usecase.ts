import { timesheetRepository } from "../repositories/timesheet.repository";
import { TimesheetStatus } from "../utils/constants";
import { startOfMonth, endOfMonth, startOfDay, startOfYear, endOfYear } from "date-fns";

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

  async upsertEntry(userId: string, date: string, totalHours: string, notes: string, tasks: any[]) {
    const entryDate = startOfDay(new Date(date));

    const existingEntry = await timesheetRepository.findEntryByUserIdAndDate(userId, entryDate);

    if (
      existingEntry &&
      existingEntry.status?.toUpperCase() === TimesheetStatus.APPROVED
    ) {
      throw new Error("Cannot edit an approved timesheet.");
    }

    const entry = await timesheetRepository.upsertEntryWithTasks(
      userId,
      entryDate,
      { totalHours: parseFloat(totalHours), notes },
      tasks
    );

    return timesheetRepository.findEntryById(entry.id);
  },

  async approveEntry(id: string, agentId: string) {
    return timesheetRepository.updateEntryStatus(id, {
      status: TimesheetStatus.APPROVED,
      approvedById: agentId,
    });
  },

  async rejectEntry(id: string, reason?: string) {
    return timesheetRepository.updateEntryStatus(id, {
      status: TimesheetStatus.REJECTED,
      notes: reason ? `REJECTED: ${reason}` : undefined,
    });
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
      .filter((e) => e.status?.toUpperCase() === TimesheetStatus.APPROVED)
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
  async getReviewEntries(filters: { status?: string; userId?: string; month?: string; year?: string }) {
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
};
