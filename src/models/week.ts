import {Activity} from './strava';

const DAY_MS = 86400000;

type Totals = {
  count: number;
  // How many of each sport, most first, and how many of them were commutes.
  bySport: {sport: string; count: number; commutes: number}[];
  distance: number;
  movingTime: number;
  elevation: number;
  load: number;
};

type WeekSummary = {
  // From Monday to now.
  current: Totals;
  // The same span of last week, so a Wednesday compares with last Wednesday.
  previous: Totals;
  // All of last week, for when this one has barely started.
  lastWeek: Totals;
  // Monday to Sunday of this week, with the distance of each day.
  days: {date: Date; distance: number; count: number}[];
};

const bySport = (activities: Activity[]): Totals['bySport'] =>
  Object.values(
    activities.reduce((counts: Record<string, Totals['bySport'][number]>, {sport_type, commute}) => {
      const entry = (counts[sport_type] ??= {sport: sport_type, count: 0, commutes: 0});
      entry.count++;
      if (commute) entry.commutes++;

      return counts;
    }, {}),
  ).sort((first, second) => second.count - first.count);

const totalsOf = (activities: Activity[]): Totals => ({
  count: activities.length,
  bySport: bySport(activities),
  distance: activities.reduce((total, {distance}) => total + distance, 0),
  movingTime: activities.reduce((total, {moving_time}) => total + moving_time, 0),
  elevation: activities.reduce((total, {total_elevation_gain}) => total + total_elevation_gain, 0),
  load: activities.reduce((total, {suffer_score}) => total + (suffer_score ?? 0), 0),
});

const mondayOf = (date: Date): Date => {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  return monday;
};

/** This week so far against the same days of last week. */
const weekSummary = (activities: Activity[], now: Date = new Date()): WeekSummary => {
  const monday = mondayOf(now);
  const between = (from: number, to: number) =>
    activities.filter(({start_date}) => {
      const time = new Date(start_date).getTime();

      return from <= time && time < to;
    });

  return {
    current: totalsOf(between(monday.getTime(), now.getTime())),
    previous: totalsOf(between(monday.getTime() - 7 * DAY_MS, now.getTime() - 7 * DAY_MS)),
    lastWeek: totalsOf(between(monday.getTime() - 7 * DAY_MS, monday.getTime())),
    days: Array.from({length: 7}, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const next = new Date(date);
      next.setDate(date.getDate() + 1);
      const ofDay = between(date.getTime(), next.getTime());

      return {date, distance: totalsOf(ofDay).distance, count: ofDay.length};
    }),
  };
};

export {mondayOf, weekSummary};
export type {Totals, WeekSummary};
