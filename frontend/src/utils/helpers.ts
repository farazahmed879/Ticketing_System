import { formatDistanceToNow } from "date-fns";

/**
 * Truncates a string to a specified length and appends "..." if it exceeds the limit.
 * @param str The string to truncate
 * @param limit The maximum length of the string
 * @returns The truncated string
 */
export const truncateString = (str: string, limit: number): string => {
  if (!str) return "";
  return str.length > limit ? `${str.substring(0, limit)}...` : str;
};

/**
 * Capitalizes the first letter of a string.
 * @param str The string to capitalize
 * @returns The capitalized string
 */
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Formats a date as a relative "x minutes ago" string.
 * Clamps the date to now so clock skew between the server and the user's
 * machine can never render a future time like "in 2 minutes".
 * @param date The date (or date string) to format
 * @returns The relative time string
 */
export const timeAgo = (date: Date | string | number): string => {
  const ts = new Date(date).getTime();
  return formatDistanceToNow(Math.min(ts, Date.now()), { addSuffix: true });
};

/**
 * Formats a currency value.
 * @param amount The amount to format
 * @param currency The currency code (default: 'USD')
 * @returns The formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

/**
 * Copies text to the clipboard. Uses the async Clipboard API when available
 * (requires a secure context: HTTPS or localhost) and falls back to a hidden
 * textarea with document.execCommand("copy") otherwise.
 * @param text The text to copy
 * @returns Whether the copy succeeded
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path (e.g. document not focused / permission denied)
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};

/**
 * Formats a date string or object into a custom format showing short month names (e.g., "Jan 12, 2024").
 * @param date The date to format
 * @returns The formatted date string
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Format a Pakistani CNIC as the user types: digits only, capped at 13, and
 * auto-dashed into the XXXXX-XXXXXXX-X pattern (e.g. "42101-1234567-1").
 */
export const formatCnic = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 5));
  if (digits.length > 5) parts.push(digits.slice(5, 12));
  if (digits.length > 12) parts.push(digits.slice(12, 13));
  return parts.join("-");
};
