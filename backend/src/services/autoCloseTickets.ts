/**
 * Auto-close tickets that have been sitting in "Resolved" or "Approved" status
 * for N days (configurable via SystemSetting.autoCloseDays) without the client
 * closing them (satisfied / unsatisfied).
 *
 * Runs once on startup, then repeats every 24 hours via setInterval.
 */
import { basePrisma as prisma } from "../prisma";
import {
  TICKET_STATUSES,
  StatusName,
  ActionName,
} from "../utils/constants";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const resolvedStatusId = TICKET_STATUSES.find(
  (s) => s.name === StatusName.RESOLVED,
)!.id;
const approvedStatusId = TICKET_STATUSES.find(
  (s) => s.name === StatusName.APPROVED,
)!.id;
const closedStatusId = TICKET_STATUSES.find(
  (s) => s.name === StatusName.CLOSED,
)!.id;

async function autoCloseStaleTickets() {
  try {
    // Read the admin-configurable settings from the DB
    const settings = await prisma.systemSetting.upsert({
      where: { key: "global" },
      update: {},
      create: { key: "global" },
    });

    if (!settings.autoCloseEnabled) {
      console.log("[AutoClose] Auto-close is disabled in system settings.");
      return;
    }

    const autoCloseDays = settings.autoCloseDays; // default 7
    const cutoff = new Date(Date.now() - autoCloseDays * ONE_DAY_MS);

    // Find tickets in Resolved or Approved that haven't been updated in N days
    const staleTickets = await prisma.ticket.findMany({
      where: {
        deleted: false,
        statusId: { in: [resolvedStatusId, approvedStatusId] },
        updatedAt: { lt: cutoff },
      },
      select: { id: true, uid: true, statusId: true, ownerId: true },
    });

    if (staleTickets.length === 0) {
      console.log("[AutoClose] No stale tickets to close.");
      return;
    }

    // Process each ticket: update status and add history entry
    for (const ticket of staleTickets) {
      const prevStatus = TICKET_STATUSES.find(
        (s) => s.id === ticket.statusId,
      )?.name;

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          statusId: closedStatusId,
          closedAt: new Date(),
          history: {
            create: {
              action: ActionName.STATUS_CHANGED,
              description: `Ticket auto-closed after ${autoCloseDays} day(s) in "${prevStatus}" without client action.`,
              actorId: ticket.ownerId,
            },
          },
        },
      });
    }

    console.log(
      `[AutoClose] Closed ${staleTickets.length} stale ticket(s): ${staleTickets.map((t) => `#${t.uid}`).join(", ")}`,
    );
  } catch (err) {
    console.error("[AutoClose] Failed to auto-close tickets:", err);
  }
}

/**
 * Start the scheduler. Call once at server startup.
 */
export function startAutoCloseScheduler() {
  // Run immediately on startup
  autoCloseStaleTickets();

  // Then run every 24 hours
  setInterval(autoCloseStaleTickets, ONE_DAY_MS);

  console.log(
    "[AutoClose] Scheduler started – checks every 24h for stale resolved/approved tickets.",
  );
}
