import type { TimesheetEntry } from "../../types";

export interface TimesheetFormData {
  totalHours: string;
  notes: string;
  tasks: {
    description: string;
    hours: number;
    projectId: string;
    ticketId: string;
  }[];
}

export interface TimesheetDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  existingEntry?: TimesheetEntry;
  googleEvents: any[];
}

export interface TimesheetReviewSidebarProps {
  userSearch: string;
  setUserSearch: (v: string) => void;
  filteredUsers: any[];
  selectedUserId: string | null;
  setSelectedUserId: (v: string | null) => void;
  pendingCounts?: Record<string, number>;
}

export interface TimesheetReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TimesheetEntry | null;
  rejectReason: string;
  onRejectReasonChange: (reason: string) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  userRoleType?: string;
}

export interface TimesheetReviewHeaderProps {
  onBack: () => void;
}

export interface TimesheetReviewFilterProps {
  month: string;
  setMonth: (v: string) => void;
  months: { value: string; label: string }[];
  year: string;
  setYear: (v: string) => void;
  years: { value: string; label: string }[];
  selectedStatus: string;
  setSelectedStatus: (v: string) => void;
  onRefresh: () => void;
  /** True while the entries query is refetching — shows a spinner on the button. */
  refreshing?: boolean;
  viewMode: "list" | "grid";
  setViewMode: (v: "list" | "grid") => void;
}

export interface UseTimesheetReviewColumnsProps {
  setSelectedEntry: (entry: TimesheetEntry) => void;
  setIsModalOpen: (open: boolean) => void;
  handleApprove: (id: string) => void;
}
