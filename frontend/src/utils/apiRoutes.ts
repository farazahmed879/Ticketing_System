/**
 * API Routes Configuration
 * Centralized file for all backend API endpoints
 */

export const API_ROUTES = {
  // Auth
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGIN_HELP: "/auth/login-help",
  },

  // Dashboard
  DASHBOARD: {
    STATS: "/common/dashboard",
  },

  // Tickets
  TICKETS: {
    BASE: "/tickets",
    BY_ID: (id: string) => `/tickets/${id}`,
    COMMENTS: (id: string) => `/tickets/${id}/comments`,
  },

  // Timesheets
  TIMESHEETS: {
    ENTRIES: "/timesheets/entries",
    APPROVE: (id: string) => `/timesheets/approve/${id}`,
    REJECT: (id: string) => `/timesheets/reject/${id}`,
    PENDING: "/timesheets/pending",
    PENDING_COUNTS: "/timesheets/pending-counts",
    REPORT: "/timesheets/report",
  },

  // Users
  USERS: {
    BASE: "/users",
    GET_BY_ROLES: "/users/usersByRole",
    BY_ID: (id: string) => `/users/${id}`,
  },

  // Roles
  ROLES: {
    BASE: "/roles",
    BY_ID: (id: string) => `/roles/${id}`,
  },

  // Requests
  REQUESTS: {
    BASE: "/requests",
    BY_ID: (id: string) => `/requests/${id}`,
  },

  // Messages
  MESSAGES: {
    CONVERSATIONS: "/messages/conversations",
    CONVERSATION_BY_ID: (id: string) => `/messages/conversations/${id}`,
    GROUPS: "/messages/groups",
    PARTNERS: "/messages/partners",
    UPDATE_MEMBERS: (id: string) => `/messages/groups/${id}/members`,
    HIDE_CONVERSATION: (id: string) => `/messages/conversations/${id}/hide`,
    DELETE_CONVERSATION: (id: string) => `/messages/conversations/${id}`,
  },

  // Departments
  DEPARTMENTS: {
    BASE: "/departments",
    BY_ID: (id: string) => `/departments/${id}`,
  },

  // Teams
  TEAMS: {
    BASE: "/teams",
    BY_ID: (id: string) => `/teams/${id}`,
    MY_TEAM: "/teams/my-team",
  },

  // Projects
  PROJECTS: {
    BASE: "/projects",
    BY_ID: (id: string) => `/projects/${id}`,
    MEMBERS: (id: string) => `/projects/${id}/members`,
  },

  // Notifications
  NOTIFICATIONS: {
    BASE: "/notifications",
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    READ_ALL: "/notifications/read-all",
    CLEAR: "/notifications/clear",
  },

  // Common / Metadata
  COMMON: {
    PRIORITIES: "/common/priorities",
    GROUPS: "/common/groups",
    TYPES: "/common/types",
    STATUSES: "/common/statuses",
    SETTINGS: "/common/settings",
  },

  // Candidates
  CANDIDATES: {
    BASE: "/candidates",
    BY_ID: (id: string) => `/candidates/${id}`,
    UPLOAD_RESUME: "/candidates/upload-resume",
    BULK_UPLOAD: "/candidates/bulk-upload",
    JOBS: "/candidates/jobs",
    POSITIONS: "/candidates/positions",
    ASSIGN_TITLE: (jobId: string) => `/candidates/jobs/${jobId}/assign-title`,
    RESOLVE_DUPLICATE: (jobId: string) => `/candidates/jobs/${jobId}/resolve-duplicate`,
    CONVERT: (id: string) => `/candidates/${id}/convert`,
    LEADERBOARD: "/candidates/leaderboard",
  },

  // Interviews
  INTERVIEWS: {
    BASE: "/interviews",
    BY_ID: (id: string) => `/interviews/${id}`,
    STATUS: (id: string) => `/interviews/${id}/status`,
    FEEDBACK: (id: string) => `/interviews/${id}/feedback`,
  },

  // Announcements
  ANNOUNCEMENTS: {
    BASE: "/announcements",
    DASHBOARD: "/announcements/dashboard",
    MARK_SEEN: (id: string) => `/announcements/moments/${id}/seen`,
    BY_ID: (id: string) => `/announcements/${id}`,
  },
};
