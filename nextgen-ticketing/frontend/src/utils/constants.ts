export const RoleName = {
  ADMIN: 'Admin',
  AGENT: 'Agent',
  EMPLOYEE: 'Employee',
  CUSTOMER: 'Customer',
} as const;

export type RoleName = typeof RoleName[keyof typeof RoleName];

export const StatusName = {
  NEW: 'New',
  OPEN: 'Open',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
  IN_PROCESS: 'In Process',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
} as const;

export type StatusName = typeof StatusName[keyof typeof StatusName];

export const PriorityName = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
} as const;

export type PriorityName = typeof PriorityName[keyof typeof PriorityName];

export const UIMessages = {
  LOGIN: {
    INVALID_CREDENTIALS: 'Invalid credentials',
    FAILED: 'Login failed. Please try again.',
    EMAIL_REQUIRED: 'Please enter a valid email address',
    HELP_SUBMITTED: 'Help request submitted successfully. Our team will contact you soon.',
    HELP_FAILED: 'Failed to submit help request. Please try again later.',
  },
  BOARD: {
    LOAD_FAILED: 'Failed to load ticket board',
    PERMISSION_DENIED: 'You do not have permission to update ticket status',
    ACCESS_DENIED: (status: string) => `Access Denied: Your role is not allowed to move tickets to "${status}"`,
    UPDATE_SUCCESS: 'Ticket status updated successfully',
    UPDATE_FAILED: 'Failed to update ticket status',
  },
  COMMON: {
    ERROR: 'An error occurred. Please try again.',
    SUCCESS: 'Success!',
  }
} as const;
