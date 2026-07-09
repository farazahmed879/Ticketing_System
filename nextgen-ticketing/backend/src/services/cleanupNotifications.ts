/**
 * Notification Cleanup background service
 *
 * Automatically deletes notifications from the database that are older than
 * N days (configured via SystemSetting.notificationRetentionDays).
 *
 * Runs once on startup, then repeats every 24 hours via setInterval.
 */
import { basePrisma as prisma } from "../prisma";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function cleanupOldNotifications() {
  try {
    // Read the settings from the DB
    const settings = await prisma.systemSetting.upsert({
      where: { key: "global" },
      update: {},
      create: { key: "global" },
    });

    if (!settings.notificationRetentionEnabled) {
      console.log("[NotificationCleanup] Auto-delete notifications is disabled in system settings.");
      return;
    }

    const retentionDays = settings.notificationRetentionDays; // default 30
    const cutoff = new Date(Date.now() - retentionDays * ONE_DAY_MS);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      console.log(
        `[NotificationCleanup] Deleted ${result.count} old notification(s) (older than ${retentionDays} day(s), cutoff: ${cutoff.toISOString()}).`
      );
    } else {
      console.log("[NotificationCleanup] No old notifications to clean up.");
    }
  } catch (err) {
    console.error("[NotificationCleanup] Failed to clean up notifications:", err);
  }
}

/**
 * Start the scheduler. Call once at server startup.
 */
export function startNotificationCleanupScheduler() {
  // Run immediately on startup
  cleanupOldNotifications();

  // Then run every 24 hours
  setInterval(cleanupOldNotifications, ONE_DAY_MS);

  console.log(
    "[NotificationCleanup] Scheduler started – checks every 24h for old notifications."
  );
}
