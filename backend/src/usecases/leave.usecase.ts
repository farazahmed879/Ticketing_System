import prisma from "../prisma";
import { startOfDay } from "date-fns";
import { LEAVE_TYPES, computeLeaveDays } from "./request.usecase";

// Timesheet entry types that consume leave balance (mirrors
// LEAVE_DAYS_BY_ENTRY_TYPE in timesheet.usecase.ts).
const TIMESHEET_LEAVE_DAYS: Record<string, number> = {
  HALF_DAY_LEAVE: 0.5,
  FULL_DAY_LEAVE: 1,
};

const LABELS: Record<string, string> = {
  HALFDAY_LEAVE: "Half day leave",
  FULLDAY_LEAVE: "Full day leave",
  VACATION: "Vacation",
  HALF_DAY_LEAVE: "Half day leave",
  FULL_DAY_LEAVE: "Full day leave",
};

const fmtDays = (d: number) => `${d} day${d === 1 ? "" : "s"}`;
const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// "yyyy-MM-dd" weekdays (Mon–Fri) from start to end inclusive.
function weekdaysBetween(startStr: string, endStr: string): string[] {
  const re = /^(\d{4})-(\d{2})-(\d{2})/;
  const s = re.exec(startStr);
  const e = re.exec(endStr || startStr);
  if (!s || !e) return [];
  const cur = new Date(Date.UTC(+s[1], +s[2] - 1, +s[3]));
  const end = new Date(Date.UTC(+e[1], +e[2] - 1, +e[3]));
  const days: string[] = [];
  // Hard cap guards against a malformed huge range.
  while (cur <= end && days.length < 366) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export const leaveUsecase = {
  /**
   * Fills the employee's timesheet for an approved leave request: one entry
   * per weekday (Half Day Leave for a half-day request, Full Day Leave
   * otherwise), linked via leaveRequestId and pre-approved. Days the employee
   * already logged work on are left untouched. Returns the number of days
   * filled. The request already deducted the balance; linked entries never
   * deduct again (see timesheet.usecase approve/reject).
   */
  async fillTimesheetFromRequest(request: {
    id: string;
    type: string;
    userId: string | null;
    data: any;
  }): Promise<number> {
    if (!request.userId) return 0;
    const data: any = request.data || {};
    if (!data.startDate) return 0;
    const isHalf = request.type === "HALFDAY_LEAVE";
    const entryType = isHalf ? "HALF_DAY_LEAVE" : "FULL_DAY_LEAVE";
    const days = isHalf
      ? weekdaysBetween(data.startDate, data.startDate)
      : weekdaysBetween(data.startDate, data.endDate || data.startDate);

    let filled = 0;
    for (const day of days) {
      // Same day normalisation as timesheetUsecase.upsertEntry.
      const date = startOfDay(new Date(day));
      const existing = await prisma.timesheetEntry.findUnique({
        where: { userId_date: { userId: request.userId, date } },
        select: { id: true, totalHours: true, hrApproved: true, managerApproved: true, _count: { select: { tasks: true } } },
      });
      const fields = {
        entryType,
        totalHours: 0,
        notes: `Auto-filled from approved ${leaveUsecase.labelFor(request.type).toLowerCase()} request`,
        managerApproved: "APPROVED",
        hrApproved: "APPROVED",
        leaveRequestId: request.id,
      };
      if (!existing) {
        await prisma.timesheetEntry.create({
          data: { userId: request.userId, date, ...fields },
        });
        filled++;
      } else if (
        existing.totalHours === 0 &&
        existing._count.tasks === 0 &&
        existing.hrApproved !== "APPROVED" &&
        existing.managerApproved !== "APPROVED"
      ) {
        // An empty / pending entry (e.g. a leave day the employee logged
        // themselves) — take it over so it isn't deducted a second time.
        await prisma.timesheetEntry.update({ where: { id: existing.id }, data: fields });
        filled++;
      }
    }
    return filled;
  },

  /**
   * Catch-up: fill the timesheet for approved leave requests that have no
   * linked entries yet (e.g. approved before auto-fill existed, or the fill
   * failed). Idempotent — requests already linked to an entry are skipped.
   * Returns the number of days filled.
   */
  async syncApprovedLeavesToTimesheet(userId: string): Promise<number> {
    const approved = await prisma.userRequest.findMany({
      where: {
        userId,
        deleted: false,
        status: "APPROVED",
        type: { in: Array.from(LEAVE_TYPES) },
      },
      select: { id: true, type: true, userId: true, data: true },
    });
    if (!approved.length) return 0;
    const linked = await prisma.timesheetEntry.findMany({
      where: { userId, leaveRequestId: { in: approved.map((r) => r.id) } },
      select: { leaveRequestId: true },
    });
    const linkedIds = new Set(linked.map((e) => e.leaveRequestId));
    let filled = 0;
    for (const r of approved) {
      if (!linkedIds.has(r.id)) filled += await leaveUsecase.fillTimesheetFromRequest(r);
    }
    return filled;
  },

  /**
   * Leave request no longer approved: remove the untouched auto-filled
   * entries; ones the employee has since edited (logged hours) are unlinked
   * and sent back for review instead of being deleted.
   */
  async removeTimesheetForRequest(requestId: string) {
    const linked = await prisma.timesheetEntry.findMany({
      where: { leaveRequestId: requestId },
      select: { id: true, totalHours: true, _count: { select: { tasks: true } } },
    });
    for (const e of linked) {
      if (e.totalHours === 0 && e._count.tasks === 0) {
        await prisma.timesheetEntry.delete({ where: { id: e.id } });
      } else {
        await prisma.timesheetEntry.update({
          where: { id: e.id },
          data: { leaveRequestId: null, managerApproved: "PENDING", hrApproved: "PENDING" },
        });
      }
    }
  },

  /**
   * Creates the "your leave balance changed" notification. `change` is signed:
   * negative = deducted, positive = restored. The current balance is read after
   * the balance write so the message shows the real remaining amount.
   */
  async notifyBalanceChange(
    userId: string,
    change: number,
    what: string,
    extraData: Record<string, any> = {},
    note?: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { leaves: true },
    });
    const balance = user?.leaves ?? 0;
    const days = Math.abs(change);
    const deducted = change < 0;

    return prisma.notification.create({
      data: {
        title: deducted ? "Leave deducted" : "Leave restored",
        message: (deducted
          ? `Your ${what} was approved. ${fmtDays(days)} deducted from your leave balance. Remaining balance: ${fmtDays(balance)}.`
          : `Your ${what} is no longer approved. ${fmtDays(days)} restored to your leave balance. Current balance: ${fmtDays(balance)}.`) +
          (note ? ` ${note}` : ""),
        type: "leave",
        userId,
        data: { ...extraData, leaveChange: change, leaveBalance: balance },
      },
    });
  },

  labelFor(type?: string | null) {
    return LABELS[type || ""] || (type || "leave").toLowerCase().replace(/_/g, " ");
  },

  /** Approved leaves that were cut from the user's balance, newest first. */
  async getLeaveHistory(userId: string, limit = 20) {
    const [requests, entries, user] = await Promise.all([
      prisma.userRequest.findMany({
        where: {
          userId,
          deleted: false,
          status: "APPROVED",
          type: { in: Array.from(LEAVE_TYPES) },
        },
        select: {
          id: true,
          type: true,
          data: true,
          updatedAt: true,
          approvedBy: { select: { fullname: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      prisma.timesheetEntry.findMany({
        where: {
          userId,
          hrApproved: "APPROVED",
          entryType: { in: Object.keys(TIMESHEET_LEAVE_DAYS) },
          // Days auto-filled from a leave request are already counted via
          // the request itself.
          OR: [{ leaveRequestId: null }, { leaveRequestId: { isSet: false } }],
        },
        select: { id: true, date: true, entryType: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { leaves: true } }),
    ]);

    const items = [
      ...requests.map((r) => {
        const data: any = r.data || {};
        const start = data.startDate ? fmtDate(data.startDate) : null;
        const end = data.endDate ? fmtDate(data.endDate) : null;
        return {
          id: r.id,
          source: "request" as const,
          type: r.type,
          label: leaveUsecase.labelFor(r.type),
          period: start && end && start !== end ? `${start} – ${end}` : start,
          days: computeLeaveDays(r.type, data.startDate, data.endDate),
          approvedAt: r.updatedAt,
          approvedBy: r.approvedBy?.fullname ?? null,
        };
      }),
      ...entries.map((e) => ({
        id: e.id,
        source: "timesheet" as const,
        type: e.entryType,
        label: leaveUsecase.labelFor(e.entryType),
        period: fmtDate(e.date),
        days: TIMESHEET_LEAVE_DAYS[e.entryType || ""] ?? 0,
        approvedAt: e.updatedAt,
        approvedBy: null,
      })),
    ]
      .filter((i) => i.days > 0)
      .sort((a, b) => +new Date(b.approvedAt) - +new Date(a.approvedAt))
      .slice(0, limit);

    return { balance: user?.leaves ?? 0, items };
  },
};
