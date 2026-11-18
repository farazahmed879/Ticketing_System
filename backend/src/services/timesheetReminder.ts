/**
 * Daily timesheet reminder.
 *
 * Every weekday at 18:00 Pakistan time (PKT, UTC+5, no DST) this sends an
 * in-app notification (plus a live socket push) to every active user whose
 * role can use timesheets and who has not yet filled today's entry.
 *
 * Scheduled with setTimeout to the next 18:00 PKT and re-armed after each
 * run, so it fires at the wall-clock time regardless of when the server
 * started. Re-runs on the same day (e.g. a restart) skip users who already
 * got today's reminder.
 */
import { Server } from "socket.io";
import { basePrisma as prisma } from "../prisma";
import { emitNotificationToUser } from "../socketio/events";
import { RoleType } from "../utils/constants";

export const TIMESHEET_REMINDER_TYPE = "timesheet_reminder";

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5
const REMINDER_HOUR_PKT = 18;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" of the given instant, as seen in Pakistan. */
function pktDateKey(d: Date): string {
  return new Date(d.getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Milliseconds from `now` until the next 18:00 PKT. */
export function msUntilNextReminder(now: Date = new Date()): number {
  const pktNow = new Date(now.getTime() + PKT_OFFSET_MS);
  const target = new Date(pktNow);
  target.setUTCHours(REMINDER_HOUR_PKT, 0, 0, 0);
  if (target.getTime() <= pktNow.getTime()) {
    target.setTime(target.getTime() + ONE_DAY_MS);
  }
  return target.getTime() - pktNow.getTime();
}

function canUseTimesheets(role: { roleType: string; permissions: any }): boolean {
  if (role.roleType === RoleType.CUSTOMER) return false;
  return role.permissions?.timesheets?.view === true;
}

export async function sendTimesheetReminders(io: Server, now: Date = new Date()) {
  try {
    const todayKey = pktDateKey(now);
    const pktDay = new Date(now.getTime() + PKT_OFFSET_MS).getUTCDay(); // 0 = Sun
    if (pktDay === 0 || pktDay === 6) {
      console.log(`[TimesheetReminder] ${todayKey} is a weekend, skipping.`);
      return;
    }

    const users = await prisma.user.findMany({
      where: { deleted: false },
      select: { id: true, role: { select: { roleType: true, permissions: true, deleted: true } } },
    });
    const candidates = users.filter((u) => u.role && !u.role.deleted && canUseTimesheets(u.role));
    if (candidates.length === 0) return;

    // Entry dates are stored as a start-of-day instant whose exact offset
    // depends on who wrote it, so look a little wider than the PKT day and
    // match on the calendar date (UTC or PKT view).
    const pktMidnightUtc = new Date(`${todayKey}T00:00:00.000Z`).getTime() - PKT_OFFSET_MS;
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        userId: { in: candidates.map((u) => u.id) },
        date: {
          gte: new Date(pktMidnightUtc - 12 * 60 * 60 * 1000),
          lt: new Date(pktMidnightUtc + ONE_DAY_MS + 12 * 60 * 60 * 1000),
        },
      },
      select: { userId: true, date: true },
    });
    const filled = new Set(
      entries
        .filter((e) => e.date.toISOString().slice(0, 10) === todayKey || pktDateKey(e.date) === todayKey)
        .map((e) => e.userId),
    );

    // Don't double-remind if the job runs twice on the same day.
    const alreadyReminded = await prisma.notification.findMany({
      where: {
        type: TIMESHEET_REMINDER_TYPE,
        createdAt: { gte: new Date(pktMidnightUtc) },
      },
      select: { userId: true },
    });
    const reminded = new Set(alreadyReminded.map((n) => n.userId));

    const targets = candidates.filter((u) => !filled.has(u.id) && !reminded.has(u.id));
    for (const u of targets) {
      const notification = await prisma.notification.create({
        data: {
          title: "Timesheet reminder",
          message: "You haven't filled your timesheet for today. Please fill it before you leave.",
          type: TIMESHEET_REMINDER_TYPE,
          userId: u.id,
          data: { date: todayKey },
        },
      });
      emitNotificationToUser(io, u.id, notification);
    }

    console.log(`[TimesheetReminder] ${todayKey}: reminded ${targets.length} user(s).`);
  } catch (err) {
    console.error("[TimesheetReminder] Failed to send reminders:", err);
  }
}

/**
 * Start the scheduler. Call once at server startup.
 */
export function startTimesheetReminderScheduler(io: Server) {
  const scheduleNext = () => {
    const delay = msUntilNextReminder();
    setTimeout(async () => {
      await sendTimesheetReminders(io);
      scheduleNext();
    }, delay);
  };
  scheduleNext();

  console.log(
    `[TimesheetReminder] Scheduler started – next run in ${Math.round(msUntilNextReminder() / 60000)} min (daily 18:00 PKT).`,
  );
}
