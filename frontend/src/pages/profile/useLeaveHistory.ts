import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";

export interface LeaveItem {
  id: string;
  source: "request" | "timesheet";
  label: string;
  period: string | null;
  days: number;
  approvedAt: string;
  approvedBy: string | null;
  /** Approved within the last RECENT_MS — drives the "recently cut" highlight. */
  recent: boolean;
}

// Deductions approved within this window count as "recent".
const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Leave balance + approved leaves cut from it. Shared by the profile card and
 * the dashboard stat (same query key, so a "leave" socket notification that
 * invalidates ["leaveHistory"] refreshes both).
 */
export function useLeaveHistory(userId: string | undefined, isSelf: boolean, enabled = true) {
  return useQuery({
    queryKey: ["leaveHistory", userId],
    enabled: enabled && !!userId,
    queryFn: async () => {
      const res = await api.get(API_ROUTES.USERS.LEAVE_HISTORY, {
        params: isSelf ? undefined : { userId },
      });
      const body = res.data as { balance: number; items: Omit<LeaveItem, "recent">[] };
      // Flag recent deductions at fetch time (keeps render pure).
      const now = Date.now();
      const items: LeaveItem[] = body.items.map((i) => ({
        ...i,
        recent: now - new Date(i.approvedAt).getTime() < RECENT_MS,
      }));
      const recentDays = items.filter((i) => i.recent).reduce((s, i) => s + i.days, 0);
      return { balance: body.balance, items, recentDays };
    },
  });
}

export const fmtDays = (d: number) => `${d} day${d === 1 ? "" : "s"}`;
