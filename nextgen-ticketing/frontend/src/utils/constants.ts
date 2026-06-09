export const RoleName = {
  ADMIN: "Admin",
  AGENT: "Manager",
  EMPLOYEE: "Employee",
  CUSTOMER: "Client",
  HR: "HR",
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const StatusName = {
  NEW: "Unassigned",
  OPEN: "Assigned",
  TRASH: "Trash",
  FAILED: "Failed",
  IN_PROCESS: "In Process",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  APPROVED: "Approved",
} as const;

export type StatusName = (typeof StatusName)[keyof typeof StatusName];

export const AnnouncementType = {
  EVENT: "event",
  IMPORTANT: "important",
  INFO: "info",
  REVIEW: "review",
  MOMENT: "moment",
} as const;

export type AnnouncementType =
  (typeof AnnouncementType)[keyof typeof AnnouncementType];

export const PriorityName = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

export type PriorityName = (typeof PriorityName)[keyof typeof PriorityName];

export const PRIORITIES = [
  {
    id: "69e5da8e0e2d511b4eab95f1",
    name: "Low",
    color: "#4caf50",
    order: 0,
  },
  {
    id: "69e5da8f0e2d511b4eab95f2",
    name: "Normal",
    color: "#2196f3",
    order: 1,
  },
  {
    id: "69e5da900e2d511b4eab95f3",
    name: "High",
    color: "#ff9800",
    order: 2,
  },
  {
    id: "69e5da900e2d511b4eab95f4",
    name: "Urgent",
    color: "#f44336",
    order: 3,
  },
];

export const TICKET_TYPES = [
  {
    id: "69e5da910e2d511b4eab95f5",
    name: "Issue",
  },
  {
    id: "69e5da910e2d511b4eab95f6",
    name: "Task",
  },
  {
    id: "69e5da920e2d511b4eab95f7",
    name: "Request",
  },
];

export const TICKET_STATUSES = [
  {
    id: "69e5da8a0e2d511b4eab95ea",
    name: "Unassigned",
    color: "#29b955",
    order: 0,
    isResolved: false,
  },
  {
    id: "69e5da8b0e2d511b4eab95eb",
    name: "Assigned",
    color: "#2196f3",
    order: 1,
    isResolved: false,
  },
  {
    id: "69e7608bc5508c8356cd4e0f",
    name: "Failed",
    color: "#ef4444",
    order: 2,
    isResolved: true,
  },
  {
    id: "69e5da8b0e2d511b4eab95ec",
    name: "In Process",
    color: "#ff9800",
    order: 3,
    isResolved: false,
  },
  {
    id: "69e5da8c0e2d511b4eab95ed",
    name: "Resolved",
    color: "#4caf50",
    order: 4,
    isResolved: true,
  },
  {
    id: "69e8990038550b9543f7236f",
    name: "Approved",
    color: "#00e676",
    order: 5,
    isResolved: true,
  },
  {
    id: "69e5da8c0e2d511b4eab95ee",
    name: "Closed",
    color: "#9e9e9e",
    order: 6,
    isResolved: true,
  },
  {
    id: "69e5f24917cc1f4597f3d5c6",
    name: "Trash",
    color: "#ff5252",
    order: 7,
    isResolved: true,
  },
];

export const UIMessages = {
  LOGIN: {
    INVALID_CREDENTIALS: "Invalid credentials",
    FAILED: "Login failed. Please try again.",
    EMAIL_REQUIRED: "Please enter a valid email address",
    HELP_SUBMITTED:
      "Help request submitted successfully. Our team will contact you soon.",
    HELP_FAILED: "Failed to submit help request. Please try again later.",
  },
  BOARD: {
    LOAD_FAILED: "Failed to load ticket board",
    PERMISSION_DENIED: "You do not have permission to update ticket status",
    ACCESS_DENIED: (status: string) =>
      `Access Denied: Your role is not allowed to move tickets to "${status}"`,
    UPDATE_SUCCESS: "Ticket status updated successfully",
    UPDATE_FAILED: "Failed to update ticket status",
  },
  COMMON: {
    ERROR: "An error occurred. Please try again.",
    SUCCESS: "Success!",
  },
  LOADING: {
    PROCESSING: "Processing...",
    CREATING_TICKET: "Creating Ticket...",
    UPDATING_TICKET: "Updating Ticket...",
    ASSIGNING_TICKET: "Assigning Ticket...",
    UPDATING_STATUS: "Updating Status...",
    UPDATING_PRIORITY: "Updating Priority...",
    UPDATING_DUE_DATE: "Updating Due Date...",
    SAVING_CHANGES: "Saving Changes...",
    CREATING_DEPARTMENT: "Creating Department...",
    UPDATING_DEPARTMENT: "Updating Department...",
    CREATING_USER: "Creating User...",
    UPDATING_USER: "Updating User...",
    DELETING: "Deleting...",
    VERIFYING: "Verifying Session...",
    LOGGING_IN: "Logging in...",
    ADDING_COMMENT: "Adding Comment...",
  },
} as const;

export const InterviewStatus = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export type InterviewStatus =
  (typeof InterviewStatus)[keyof typeof InterviewStatus];

export const CandidateStatus = {
  ACTIVE: "Active",
  HIRED: "Hired",
  REJECTED: "Rejected",
  ON_HOLD: "On Hold",
} as const;

export type CandidateStatus =
  (typeof CandidateStatus)[keyof typeof CandidateStatus];

export const Recommendation = {
  STRONG_HIRE: "Strong Hire",
  HIRE: "Hire",
  NEUTRAL: "Neutral",
  NO_HIRE: "No Hire",
  STRONG_NO_HIRE: "Strong No Hire",
} as const;

export type Recommendation =
  (typeof Recommendation)[keyof typeof Recommendation];

export const ProjectStatus = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const DEFAULT_PAGE_SIZE = 10;

export const COUNTRY_CODES = [
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+92", label: "🇵🇰 +92" },
  { value: "+91", label: "🇮🇳 +91" },
  { value: "+971", label: "🇦🇪 +971" },
  { value: "+966", label: "🇸🇦 +966" },
  { value: "+61", label: "🇦🇺 +61" },
  { value: "+49", label: "🇩🇪 +49" },
  { value: "+33", label: "🇫🇷 +33" },
  { value: "+81", label: "🇯🇵 +81" },
  { value: "+86", label: "🇨🇳 +86" },
  { value: "+7", label: "🇷🇺 +7" },
  { value: "+90", label: "🇹🇷 +90" },
  { value: "+20", label: "🇪🇬 +20" },
] as const;

export const PROJECT_STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "On Hold", label: "On Hold" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];
