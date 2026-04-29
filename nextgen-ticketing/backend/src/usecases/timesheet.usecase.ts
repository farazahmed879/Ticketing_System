import { timesheetRepository } from "../repositories/timesheet.repository";
import { StatusName } from "../utils/constants";
import { startOfMonth, endOfMonth, startOfDay } from "date-fns";

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

    if (existingEntry && existingEntry.status === StatusName.APPROVED) {
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
      status: StatusName.APPROVED,
      approvedById: agentId,
    });
  },

  async rejectEntry(id: string, reason?: string) {
    return timesheetRepository.updateEntryStatus(id, {
      status: StatusName.REJECTED,
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
      .filter((e) => e.status === StatusName.APPROVED)
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
};
