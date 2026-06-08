export const RoleName = {
  ADMIN: "Admin",
  AGENT: "Manager",
  EMPLOYEE: "Employee",
  CUSTOMER: "Client",
  HR: "HR",
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const RoleType = {
  AGENTS: "agents",
  ADMINS: "admins",
  CUSTOMERS: "clients",
  ALL: "all",
} as const;
export type RoleType = (typeof RoleType)[keyof typeof RoleType];

export const TicketType = {
  ISSUE: "Issue",
  TASK: "Task",
  REQUEST: "Request",
} as const;
export type TicketType = (typeof TicketType)[keyof typeof TicketType];

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

export const StatusName = {
  NEW: "Unassigned",
  OPEN: "Assigned",
  TRASH: "Trash",
  FAILED: "Failed",
  IN_PROCESS: "In Process",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  APPROVED: "Approved",
  PENDING: "Pending",
  REJECTED: "Rejected",
} as const;
export type StatusName = (typeof StatusName)[keyof typeof StatusName];

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

export const ActionName = {
  TICKET_CREATED: "TICKET_CREATED",
  TICKET_UPDATED: "TICKET_UPDATED",
  TICKET_DELETED: "TICKET_DELETED",
  STATUS_CHANGED: "STATUS_CHANGED",
  PRIORITY_CHANGED: "PRIORITY_CHANGED",
  ASSIGNEE_CHANGED: "ASSIGNEE_CHANGED",
  COMMENT_ADDED: "COMMENT_ADDED",
  NOTE_ADDED: "NOTE_ADDED",
  TIMESHEET_CREATED: "TIMESHEET_CREATED",
  TIMESHEET_UPDATED: "TIMESHEET_UPDATED",
  TIMESHEET_APPROVED: "TIMESHEET_APPROVED",
  TIMESHEET_REJECTED: "TIMESHEET_REJECTED",
  DUE_DATE_CHANGED: "DUE_DATE_CHANGED",
} as const;
export type ActionName = (typeof ActionName)[keyof typeof ActionName];

export const LoginHelpType = {
  FORGOT_PASSWORD: "FORGOT_PASSWORD",
  UNABLE_TO_LOGIN: "UNABLE_TO_LOGIN",
  OTHER: "OTHER",
} as const;
export type LoginHelpType = (typeof LoginHelpType)[keyof typeof LoginHelpType];

export const SocketEvent = {
  TICKET_UPDATED: "ticket:updated",
  CHAT_SEND: "chat:send",
  CHAT_RECEIVE: "chat:receive",
  CHAT_TYPING: "chat:typing",
  CHAT_STOP_TYPING: "chat:stopTyping",
  NOTIFICATIONS_GET: "notifications:get",
  NOTIFICATIONS_UPDATE: "notifications:update",
  NOTIFICATIONS_NEW: "notifications:new",
  USERS_ONLINE: "users:online",
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];

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

export const NotificationMessages = {
  TICKET_CREATED: (subject: string) =>
    `A new ticket has been created: ${subject}`,
  CUSTOMER_TICKET_CREATED: (uid: number, owner: string) =>
    `A new ticket #${uid} has been created by ${owner}.`,
  TICKET_ASSIGNED: (uid: number) => `Ticket #${uid} has been assigned to you`,
  TICKET_UPDATED: (uid: number) => `Ticket #${uid} has been updated`,
  NEW_COMMENT: (uid: number) => `A new comment was added to Ticket #${uid}`,
  TITLES: {
    NEW_TICKET: "New Ticket",
    CUSTOMER_TICKET: "New Customer Ticket",
    ASSIGNMENT: "Ticket Assigned",
    UPDATE: "Ticket Updated",
    COMMENT: "New Comment",
  },
} as const;
