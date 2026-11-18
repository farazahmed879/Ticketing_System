/**
 * Where clicking a notification should take the user. Single source of truth
 * for the bell dropdown, the Notifications page and desktop notifications —
 * add new notification kinds here, not in each click handler.
 * Returns null when there's nothing specific to open.
 */
export function getNotificationLink(n: {
  type?: string;
  data?: Record<string, any> | null;
}): string | null {
  const d = n.data || {};
  if (d.ticketId) return `/tickets/${d.ticketId}`;
  if (n.type === "message" || d.roomId) {
    return d.roomId ? `/messages?roomId=${d.roomId}` : "/messages";
  }
  if (n.type === "leave") return "/profile";
  if (d.interviewId) return `/interviews/${d.interviewId}`;
  if (d.requestId) return `/requests?requestId=${d.requestId}`;
  if (d.announcementId) return `/announcements?postId=${d.announcementId}`;
  if (n.type === "timesheet_reminder") return "/timesheet";
  if (d.candidateId) return `/candidates/${d.candidateId}`;
  return null;
}
