import type { PasswordStrength } from "./types";

export const PASSWORD_VALIDATION = {
  MIN_LENGTH: 6,
  FORBIDDEN_DEFAULT_PASSWORD: "admin123",
} as const;

export const CHANGE_PASSWORD_UI_TEXT = {
  MODAL_TITLE: "Change Default Password",
  MODAL_MAX_WIDTH: "480px",
  NOTICE_TITLE: "Security Recommendation",
  NOTICE_DESC:
    "You are currently using an initial or default password. Please update your password to secure your account and data.",
  CURRENT_PASSWORD_LABEL: "Current / Default Password",
  CURRENT_PASSWORD_PLACEHOLDER: "Enter current password (e.g. admin123)",
  NEW_PASSWORD_LABEL: "New Password",
  getNewPasswordPlaceholder: (minLen: number) => `At least ${minLen} characters`,
  CONFIRM_PASSWORD_LABEL: "Confirm New Password",
  CONFIRM_PASSWORD_PLACEHOLDER: "Re-enter new password",
  SHOW_PASSWORD_TITLE: "Show password",
  HIDE_PASSWORD_TITLE: "Hide password",
  REMIND_LATER_BTN: "Remind Me Later",
  UPDATE_BTN: "Update Password",
} as const;

export const PASSWORD_ERROR_MESSAGES = {
  CURRENT_REQUIRED: "Please enter your current password.",
  MIN_LENGTH: `New password must be at least ${PASSWORD_VALIDATION.MIN_LENGTH} characters long.`,
  CANNOT_BE_DEFAULT: "New password cannot be the default password.",
  CANNOT_MATCH_CURRENT: "New password must be different from current password.",
  PASSWORDS_MISMATCH: "New passwords do not match.",
  GENERIC_UPDATE_ERROR: "Failed to update password. Please check your current password.",
  SUCCESS: "Password changed successfully! Your account is now secured.",
} as const;

export const calculatePasswordStrength = (pass: string): PasswordStrength => {
  if (!pass) return { score: 0, label: "", level: "" };
  if (pass.length < PASSWORD_VALIDATION.MIN_LENGTH) {
    return { score: 1, label: "Too short", level: "too_short" };
  }

  let score = 1;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

  if (score <= 2) return { score: 2, label: "Weak", level: "weak" };
  if (score === 3) return { score: 3, label: "Good", level: "good" };
  return { score: 4, label: "Strong", level: "strong" };
};
