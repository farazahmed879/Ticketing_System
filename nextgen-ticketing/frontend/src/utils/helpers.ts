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
