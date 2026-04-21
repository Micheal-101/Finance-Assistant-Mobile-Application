/**
 * Shared formatting utilities.
 * Single source of truth for currency, date, and month formatting across all screens.
 */

/** Returns the current month as "YYYY-MM" using the device's local clock. */
export function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formats an amount as a currency string.
 * Defaults to GBP / en-GB so the app targets England users out of the box,
 * but accepts any IANA currency code and BCP-47 locale for future configurability.
 */
export function formatCurrency(
  amount: number,
  currency = 'GBP',
  locale = 'en-GB',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Formats a "YYYY-MM" month key as a long human-readable string, e.g. "April 2026". */
export function formatMonth(month: string, locale = 'en-GB'): string {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return month;
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Formats an ISO date string as a long human-readable date, e.g. "1 April 2026". */
export function formatDate(dateString: string, locale = 'en-GB'): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Formats a "YYYY-MM" key as a 3-letter month abbreviation, e.g. "Apr". */
export function formatMonthLabel(monthKey: string, locale = 'en-GB'): string {
  const date = new Date(`${monthKey}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
}

/** Formats an expense heading from an ISO date string, e.g. "Tuesday, 1 April". */
export function formatExpenseHeading(dateIso: string, locale = 'en-GB'): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return 'Recent expenses';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
