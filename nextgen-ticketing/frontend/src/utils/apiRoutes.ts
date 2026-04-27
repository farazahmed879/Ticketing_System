/**
 * API Routes Configuration
 * Centralized file for all backend API endpoints
 */

export const API_ROUTES = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    LOGIN_HELP: '/auth/login-help',
  },

  // Dashboard
  DASHBOARD: {
    STATS: '/common/dashboard',
  },

  // Tickets
  TICKETS: {
    BASE: '/tickets',
    BY_ID: (id: string) => `/tickets/${id}`,
    COMMENTS: (id: string) => `/tickets/${id}/comments`,
  },
  
  // Timesheets
  TIMESHEETS: {
    ENTRIES: '/timesheets/entries',
    APPROVE: (id: string) => `/timesheets/approve/${id}`,
    REJECT: (id: string) => `/timesheets/reject/${id}`,
    PENDING: '/timesheets/pending',
    REPORT: '/timesheets/report',
  },

  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
  },

  // Roles
  ROLES: {
    BASE: '/roles',
    BY_ID: (id: string) => `/roles/${id}`,
  },

  // Requests
  REQUESTS: {
    BASE: '/requests',
    BY_ID: (id: string) => `/requests/${id}`,
  },

  // Messages
  MESSAGES: {
    CONVERSATIONS: '/messages/conversations',
    CONVERSATION_BY_ID: (id: string) => `/messages/conversations/${id}`,
    GROUPS: '/messages/groups',
    PARTNERS: '/messages/partners',
  },

  // Departments
  DEPARTMENTS: {
    BASE: '/departments',
    BY_ID: (id: string) => `/departments/${id}`,
  },

  // Notifications
  NOTIFICATIONS: {
    BASE: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all',
    CLEAR: '/notifications/clear',
  },

  // Common / Metadata
  COMMON: {
    PRIORITIES: '/common/priorities',
    GROUPS: '/common/groups',
    TYPES: '/common/types',
    STATUSES: '/common/statuses',
  },

  // Candidates
  CANDIDATES: {
    BASE: '/candidates',
    BY_ID: (id: string) => `/candidates/${id}`,
    UPLOAD_RESUME: '/candidates/upload-resume',
  },

  // Interviews
  INTERVIEWS: {
    BASE: '/interviews',
    BY_ID: (id: string) => `/interviews/${id}`,
    STATUS: (id: string) => `/interviews/${id}/status`,
    FEEDBACK: (id: string) => `/interviews/${id}/feedback`,
  },
};
