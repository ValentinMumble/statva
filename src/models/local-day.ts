import {DetailedActivity} from './strava';

const DAY_MS = 86_400_000;

const pad = (value: number): string => String(value).padStart(2, '0');

// start_date_local is the wall time where the activity happened, written with a Z suffix,
// so its first ten characters are the local day, whatever time zone reads it.
const localDay = ({start_date_local}: Pick<DetailedActivity, 'start_date_local'>): string =>
  start_date_local.slice(0, 10);

const localYear = (activity: Pick<DetailedActivity, 'start_date_local'>): number =>
  Number(localDay(activity).slice(0, 4));

const localHour = ({start_date_local}: Pick<DetailedActivity, 'start_date_local'>): number =>
  new Date(start_date_local).getUTCHours();

// Days since 1 January 1970, so two days can be compared or stepped through without time zones.
const dayNumber = (day: string): number => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);

const dayFromNumber = (number: number): string => new Date(number * DAY_MS).toISOString().slice(0, 10);

// Monday is 0 and Sunday 6, as the week starts in Europe.
const weekdayOf = (day: string): number => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

// The day on this device, the reference for streaks that are still going.
const deviceDay = (now: Date): string => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

// A day as people read it, like "12 Oct 2024". The day is read as UTC so the reader's own
// time zone cannot move it to the day before.
const formatDay = (day: string, locale: string, options: Intl.DateTimeFormatOptions = {}): string =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
    timeZone: 'UTC',
  });

// Two days as a span, with the year written once when both share it.
const formatDayRange = (from: string, to: string, locale: string): string => {
  if (from === to) return formatDay(from, locale);

  const sameYear = from.slice(0, 4) === to.slice(0, 4);

  return `${formatDay(from, locale, sameYear ? {year: undefined} : {})} to ${formatDay(to, locale)}`;
};

export {dayFromNumber, dayNumber, deviceDay, formatDay, formatDayRange, localDay, localHour, localYear, weekdayOf};
