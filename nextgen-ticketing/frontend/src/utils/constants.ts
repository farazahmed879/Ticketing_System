export const RoleName = {
  ADMIN: "Admin",
  AGENT: "Agent",
  EMPLOYEE: "Employee",
  CUSTOMER: "Customer",
  HR: "HR",
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const StatusName = {
  NEW: "New",
  OPEN: "Open",
  CANCELLED: "Cancelled",
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

export type AnnouncementType = (typeof AnnouncementType)[keyof typeof AnnouncementType];

export const PriorityName = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

export type PriorityName = (typeof PriorityName)[keyof typeof PriorityName];

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

export type InterviewStatus = (typeof InterviewStatus)[keyof typeof InterviewStatus];

export const CandidateStatus = {
  ACTIVE: "Active",
  HIRED: "Hired",
  REJECTED: "Rejected",
  ON_HOLD: "On Hold",
} as const;

export type CandidateStatus = (typeof CandidateStatus)[keyof typeof CandidateStatus];

export const Recommendation = {
  STRONG_HIRE: "Strong Hire",
  HIRE: "Hire",
  NEUTRAL: "Neutral",
  NO_HIRE: "No Hire",
  STRONG_NO_HIRE: "Strong No Hire",
} as const;

export type Recommendation = (typeof Recommendation)[keyof typeof Recommendation];

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
