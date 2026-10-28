export const DELETE_ALL_CANDIDATES = {
  REQUIRED_CONFIRMATION: "DELETE",
  MODAL_TITLE: "Delete All Candidates",
  MODAL_MAX_WIDTH: "480px",
  DASHBOARD_PATH: "/",

  // Danger Banner
  DANGER_ZONE_TITLE: "CRITICAL ACTION: Danger Zone",
  WARNING_PREFIX: "You are about to delete",
  PROFILES_TARGET: "all candidate profiles",
  ACTIVE_SUFFIX: "active candidates",
  WARNING_BODY:
    ", including their resumes, notes, and scheduled interview history. This operation",
  CANNOT_BE_UNDONE: "cannot be undone.",

  // Input Labels & Placeholders
  CONFIRM_LABEL_PREFIX: "Type",
  CONFIRM_LABEL_SUFFIX: "to confirm:",
  getConfirmPlaceholder: (token: string) => `Type ${token}`,
  PASSWORD_LABEL: "Enter your Admin Password:",
  PASSWORD_PLACEHOLDER: "Your administrator account password",
  SHOW_PASSWORD_TITLE: "Show password",
  HIDE_PASSWORD_TITLE: "Hide password",

  // Button Labels
  CANCEL_BTN_TEXT: "Cancel",
  CONFIRM_BTN_TEXT: "Delete All Candidates",

  // Notification & Task Messages
  TASK_TITLE: "Deleting All Candidates",
  GENERIC_ERROR: "Failed to delete all candidates. Please check your password.",
  getSuccessMessage: (count: number) =>
    `Successfully deleted all candidates (${count} total).`,
} as const;
