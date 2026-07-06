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
