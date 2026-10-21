/** Formatting for the new screens, in the rider's locale. */

const DAY_MS = 86400000;

const number = (value: number, locale: string, digits = 0): string =>
  value.toLocaleString(locale, {maximumFractionDigits: digits, minimumFractionDigits: digits});

const km = (metres: number, locale: string): string =>
  `${number(metres / 1000, locale, 0 < metres && metres < 10000 ? 1 : 0)} km`;

const metres = (value: number, locale: string): string => `${number(value, locale)} m`;

const duration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return 0 === hours ? `${minutes} min` : `${hours}h${String(minutes).padStart(2, '0')}`;
};

/** "Today", "Yesterday", the weekday within the week, or a short date. */
const relativeDay = (date: Date, locale: string, now: Date = new Date()): string => {
  const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / DAY_MS);

  if (0 === days) return 'Today';
  if (1 === days) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString(locale, {weekday: 'long'});

  return date.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(days > 300 ? {year: 'numeric'} : {}),
  });
};

/** The change from one figure to another, as a signed percentage, or null without a base. */
const change = (current: number, previous: number): number | null =>
  0 === previous ? null : Math.round(((current - previous) / previous) * 100);

export {change, duration, km, metres, number, relativeDay};
