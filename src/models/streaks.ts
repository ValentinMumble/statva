import {dayFromNumber, dayNumber, localDay, weekdayOf} from './local-day';
import {DetailedActivity} from './strava';

// A stretch of days or weeks, with the day it starts and the day it ends. For weeks they
// are the Monday of the first week and the Sunday of the last; for a break they are the
// activities on each side of it.
type Run = {length: number; from: string | null; to: string | null};

type Streaks = {
  longestDays: Run;
  currentDays: Run;
  longestWeeks: Run;
  currentWeeks: Run;
  // Days with nothing recorded between two activities.
  longestBreak: Run;
};

type Span = {start: number; end: number; length: number};

const EMPTY: Run = {length: 0, from: null, to: null};

// Groups sorted, distinct numbers into runs where each one is `step` after the one before.
const findRuns = (numbers: number[], step: number): Span[] =>
  numbers.reduce((runs: Span[], number) => {
    const last = runs.at(-1);

    if (undefined !== last && step === number - last.end) {
      last.end = number;
      last.length++;
    } else {
      runs.push({start: number, end: number, length: 1});
    }

    return runs;
  }, []);

// On a tie the most recent run wins, as it is the one people remember.
const longestOf = (runs: Span[]): Span | undefined =>
  runs.reduce(
    (best: Span | undefined, run) => (undefined === best || run.length >= best.length ? run : best),
    undefined,
  );

// `tail` stretches the end, so a run of weeks ends on the Sunday of its last week.
const toRun = (span: Span | undefined, tail = 0): Run =>
  undefined === span
    ? EMPTY
    : {length: span.length, from: dayFromNumber(span.start), to: dayFromNumber(span.end + tail)};

const distinctSorted = (numbers: number[]): number[] => [...new Set(numbers)].sort((low, high) => low - high);

const mondayOf = (day: string): number => dayNumber(day) - weekdayOf(day);

// Longest run of days in a row with something recorded, from sorted local days.
const longestStreak = (days: string[]): number =>
  longestOf(findRuns(distinctSorted(days.map(dayNumber)), 1))?.length ?? 0;

const computeStreaks = (activities: DetailedActivity[], today: string): Streaks => {
  const days = distinctSorted(activities.map(activity => dayNumber(localDay(activity))));
  const weeks = distinctSorted(activities.map(activity => mondayOf(localDay(activity))));
  const dayRuns = findRuns(days, 1);
  const weekRuns = findRuns(weeks, 7);
  const lastDayRun = dayRuns.at(-1);
  const lastWeekRun = weekRuns.at(-1);

  // A streak still counts when today has nothing yet: there is the rest of the day (or
  // week) to keep it going.
  const currentDays = undefined !== lastDayRun && lastDayRun.end >= dayNumber(today) - 1 ? lastDayRun : undefined;
  const currentWeeks = undefined !== lastWeekRun && lastWeekRun.end >= mondayOf(today) - 7 ? lastWeekRun : undefined;

  const longestBreak = days.reduce((best: Run, day, index) => {
    const next = days[index + 1];
    const gap = undefined === next ? 0 : next - day - 1;

    return 0 < gap && gap >= best.length ? {length: gap, from: dayFromNumber(day), to: dayFromNumber(next)} : best;
  }, EMPTY);

  return {
    longestDays: toRun(longestOf(dayRuns)),
    currentDays: toRun(currentDays),
    longestWeeks: toRun(longestOf(weekRuns), 6),
    currentWeeks: toRun(currentWeeks, 6),
    longestBreak,
  };
};

export {computeStreaks, longestStreak};
export type {Run, Streaks};
