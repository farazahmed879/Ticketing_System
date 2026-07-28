import prisma from "../prisma";
import { startOfDay } from "date-fns";

export const timesheetRepository = {
  async findEntries(where: any) {
    return prisma.timesheetEntry.findMany({
      where,
      include: {
        tasks: {
          include: {
            project: { select: { id: true, name: true } },
            ticket: { select: { id: true, uid: true, subject: true } },
          },
        },
      },
      orderBy: { date: "asc" },
    });
  },

  async findEntryByUserIdAndDate(userId: string, date: Date) {
    return prisma.timesheetEntry.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });
  },

  async findEntryById(id: string) {
    return prisma.timesheetEntry.findUnique({
      where: { id },
      include: { tasks: true },
    });
  },

  async upsertEntryWithTasks(userId: string, date: Date, data: any, tasks: any[]) {
    return prisma.$transaction(async (tx) => {
      // 1. Find existing entry
      const existingEntry = await tx.timesheetEntry.findUnique({
        where: { userId_date: { userId, date } },
      });

      // 2. Delete existing tasks if updating
      if (existingEntry) {
        await tx.timesheetTask.deleteMany({
          where: { entryId: existingEntry.id },
        });
      }

      // 3. Upsert the entry — reset approval flags on re-submission
      const upsertedEntry = await tx.timesheetEntry.upsert({
        where: { userId_date: { userId, date } },
        update: {
          totalHours: data.totalHours,
          notes: data.notes,
          entryType: data.entryType,
          managerApproved: "PENDING",
          hrApproved: "PENDING",
        },
        create: {
          userId,
          date,
          totalHours: data.totalHours,
          notes: data.notes,
          entryType: data.entryType,
          managerApproved: "PENDING",
          hrApproved: "PENDING",
        },
      });

      // 4. Create new tasks
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

        // 5. Auto-create comments on tickets if linked
        for (const task of tasks) {
          if (task.ticketId) {
            await tx.comment.create({
              data: {
                comment: `[Timesheet Task] ${task.description} (${task.hours} hrs)`,
                isNote: true,
                authorId: userId,
                ticketId: task.ticketId,
              },
            });
          }
        }
      }

      return upsertedEntry;
    });
  },

  async updateEntryStatus(id: string, data: any) {
    return prisma.timesheetEntry.update({
      where: { id },
      data,
    });
  },

  async findPendingEntries() {
    return prisma.timesheetEntry.findMany({
      where: {
        managerApproved: "PENDING",
        hrApproved: "PENDING",
      },
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
  },

  async findEntriesForReport(userId: string, startDate: Date, endDate: Date) {
    return prisma.timesheetEntry.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        tasks: {
          include: { project: true },
        },
      },
    });
  },

  async findReviewEntries(filters: { status?: string; userId?: string; startDate?: Date; endDate?: Date; roleType?: string }) {
    const where: any = {};

    // Map the filter status to the boolean fields
    if (filters.status === "PENDING") {
      if (filters.roleType === "hr") {
        where.hrApproved = "PENDING";
      } else {
        where.managerApproved = "PENDING";
      }
    } else if (filters.status === "MANAGER_APPROVED") {
      where.managerApproved = "APPROVED";
    } else if (filters.status === "HR_APPROVED") {
      where.hrApproved = "APPROVED";
    } else if (filters.status === "REJECTED") {
      where.OR = [
        { managerApproved: "REJECTED" },
        { hrApproved: "REJECTED" }
      ];
    }
    // "ALL" — no status filter

    if (filters.userId) where.userId = filters.userId;
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    return prisma.timesheetEntry.findMany({
      where,
      include: {
        user: { select: { id: true, fullname: true, email: true, image: true } },
        tasks: {
          include: {
            project: { select: { name: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });
  },
  
  async getPendingCounts(startDate?: Date, endDate?: Date, roleType?: string) {
    const where: any = {};
    if (roleType === "hr") {
      where.hrApproved = "PENDING";
    } else {
      where.managerApproved = "PENDING";
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return prisma.timesheetEntry.groupBy({
      by: ["userId"],
      _count: { id: true },
      where,
    });
  },
};
