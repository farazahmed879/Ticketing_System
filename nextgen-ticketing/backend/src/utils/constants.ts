export const RoleName = {
  ADMIN: "Admin",
  AGENT: "Agent",
  EMPLOYEE: "Employee",
  CUSTOMER: "Customer",
  HR: "HR",
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const RoleType = {
  AGENTS: "agents",
  ADMINS: "admins",
  CUSTOMERS: "customers",
  ALL: "all",
} as const;
export type RoleType = (typeof RoleType)[keyof typeof RoleType];

export const TicketType = {
  ISSUE: "Issue",
  TASK: "Task",
  REQUEST: "Request",
} as const;
export type TicketType = (typeof TicketType)[keyof typeof TicketType];

export const StatusName = {
  NEW: "Unassigned",
  OPEN: "Assigned",
  CANCELLED: "Cancelled",
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
