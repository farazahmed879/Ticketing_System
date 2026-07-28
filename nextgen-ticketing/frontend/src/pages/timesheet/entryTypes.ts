import type { TimesheetEntryType } from "../../types";

// "WORK" is a legacy value from before day-type tracking existed — it's no
// longer offered in the picker, but old entries may still carry it.
export const ENTRY_TYPE_OPTIONS: { value: TimesheetEntryType; label: string }[] = [
  { value: "ONSITE_OFFICE", label: "Onsite / Office" },
  { value: "ONSITE_CLIENT", label: "Onsite / Client" },
  { value: "WORK_FROM_HOME", label: "Work From Home" },
  { value: "WEEKEND", label: "Weekend" },
  { value: "PUBLIC_HOLIDAY", label: "Public Holiday" },
  { value: "HALF_DAY_LEAVE", label: "Half Day Leave" },
  { value: "FULL_DAY_LEAVE", label: "Full Day Leave" },
];

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  WORK: "Onsite / Office",
  ONSITE_OFFICE: "Onsite / Office",
  ONSITE_CLIENT: "Onsite / Client",
  WORK_FROM_HOME: "Work From Home",
  WEEKEND: "Weekend",
  PUBLIC_HOLIDAY: "Public Holiday",
  HALF_DAY_LEAVE: "Half Day Leave",
  FULL_DAY_LEAVE: "Full Day Leave",
};

// Entry types with no work hours/tasks. HALF_DAY_LEAVE is excluded — it still
// requires the worked half-day's hours/tasks to be logged.
const ZERO_HOUR_ENTRY_TYPES = new Set(["WEEKEND", "PUBLIC_HOLIDAY", "FULL_DAY_LEAVE"]);

// Entry types that deduct from the employee's leave balance, and how many days.
const LEAVE_DAYS_BY_ENTRY_TYPE: Record<string, number> = {
  HALF_DAY_LEAVE: 0.5,
  FULL_DAY_LEAVE: 1,
};

export function isZeroHourEntryType(entryType?: string | null): boolean {
  return !!entryType && ZERO_HOUR_ENTRY_TYPES.has(entryType);
}

export function getLeaveDaysForEntryType(entryType?: string | null): number {
  return (entryType && LEAVE_DAYS_BY_ENTRY_TYPE[entryType]) || 0;
}

export function getEntryTypeLabel(entryType?: string | null): string {
  return (entryType && ENTRY_TYPE_LABELS[entryType]) || "Onsite / Office";
}

// Legacy entries (entryType "WORK" or missing) map to Onsite / Office — the
// closest equivalent of the old generic "work day".
export function normalizeEntryType(entryType?: string | null): TimesheetEntryType {
  if (!entryType || entryType === "WORK") return "ONSITE_OFFICE";
  return entryType as TimesheetEntryType;
}
