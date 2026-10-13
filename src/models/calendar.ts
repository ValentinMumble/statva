import {dayFromNumber, dayNumber, localDay, localHour, localYear, weekdayOf} from './local-day';
import {DetailedActivity} from './strava';

type CalendarDay = {
  day: string;
  // Weeks are the columns and weekdays the rows, Monday on top.
  column: number;
  row: number;
  distance: number;
  count: number;
};

type Calendar = {
  year: number;
  columns: number;
  days: CalendarDay[];
  // The biggest day of the year, which sets the darkest colour.
  max: number;
  // The column where each month starts, for the labels above the grid.
  months: {month: number; column: number}[];
};

type RideClock = {
  // Seven rows from Monday to Sunday, each with 24 hours of activity counts.
  counts: number[][];
  max: number;
};

// Four shades past empty, like GitHub, so the colours stay easy to tell apart.
const HEAT_LEVELS = 4;

// Years with at least one activity, newest first.
const activityYears = (activities: DetailedActivity[]): number[] =>
  [...new Set(activities.map(localYear))].sort((newer, older) => older - newer);

// Shade from 0 (nothing) to 4 (the biggest). Anything recorded gets at least the
// lightest shade, so a short walk or a gym session still shows up.
const heatLevel = (value: number, max: number, recorded = 0 < value): number => {
  if (!recorded) return 0;
  if (0 >= max) return 1;

  return Math.max(1, Math.min(HEAT_LEVELS, Math.ceil((value / max) * HEAT_LEVELS)));
};

const buildCalendar = (activities: DetailedActivity[], year: number): Calendar => {
  const first = dayNumber(`${year}-01-01`);
  const length = dayNumber(`${year + 1}-01-01`) - first;
  // Days before the first Monday sit in the first column too.
  const offset = weekdayOf(`${year}-01-01`);

  const totals = activities
    .filter(activity => localYear(activity) === year)
    .reduce((map: Map<string, {distance: number; count: number}>, activity) => {
      const day = localDay(activity);
      const entry = map.get(day) ?? {distance: 0, count: 0};
      map.set(day, {distance: entry.distance + activity.distance, count: entry.count + 1});

      return map;
    }, new Map());

  const days = [...Array(length).keys()].map(index => {
    const day = dayFromNumber(first + index);
    const {distance, count} = totals.get(day) ?? {distance: 0, count: 0};

    return {day, column: Math.floor((index + offset) / 7), row: (index + offset) % 7, distance, count};
  });

  return {
    year,
    columns: Math.floor((length - 1 + offset) / 7) + 1,
    days,
    max: Math.max(0, ...days.map(({distance}) => distance)),
    months: [...Array(12).keys()].map(month => ({
      month: month + 1,
      column: Math.floor((dayNumber(`${year}-${String(month + 1).padStart(2, '0')}-01`) - first + offset) / 7),
    })),
  };
};

// How many activities started in each hour of each weekday, in local time.
const buildRideClock = (activities: DetailedActivity[]): RideClock => {
  const counts = [...Array(7)].map(() => new Array<number>(24).fill(0));

  activities.forEach(activity => {
    counts[weekdayOf(localDay(activity))][localHour(activity)]++;
  });

  return {counts, max: Math.max(0, ...counts.flat())};
};

export {activityYears, buildCalendar, buildRideClock, HEAT_LEVELS, heatLevel};
export type {Calendar, CalendarDay, RideClock};
