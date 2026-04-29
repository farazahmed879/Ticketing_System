import prisma from "../prisma";
import { StatusName } from "../utils/constants";
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
        approvedBy: { select: { id: true, fullname: true } },
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

      // 3. Upsert the entry
      const upsertedEntry = await tx.timesheetEntry.upsert({
        where: { userId_date: { userId, date } },
        update: {
          totalHours: data.totalHours,
          notes: data.notes,
          status: StatusName.PENDING,
        },
        create: {
          userId,
          date,
          totalHours: data.totalHours,
          notes: data.notes,
          status: StatusName.PENDING,
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
};
