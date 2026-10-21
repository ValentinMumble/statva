import {getPowerZone} from './activity-format';
import {extractNormalizedPower} from './activity-meta';
import {GetFtp} from './ftp';
import {Activity, DetailedActivity} from './strava';

// The durations the server keeps a best average power for, with how to say them.
const CURVE_DURATIONS: [number, string][] = [
  [5, '5 s'],
  [15, '15 s'],
  [30, '30 s'],
  [60, '1 min'],
  [120, '2 min'],
  [300, '5 min'],
  [600, '10 min'],
  [1200, '20 min'],
  [1800, '30 min'],
  [3600, '1 h'],
];

// Must match POWER_BAND on the server, which counts seconds in bands of this many watts.
const POWER_BAND_WATTS = 25;
const ZONE_COUNT = 7;
const WEEK_MS = 7 * 86400000;

// Strava's best efforts on a run, in the order they are shown.
const RUN_DISTANCES = ['1K', '5K', '10K', 'Half-Marathon', 'Marathon'];

type CurveRow = {duration: string} & Record<string, number | string | null>;

const yearOf = ({start_date_local}: {start_date_local: string}): number => Number(start_date_local.slice(0, 4));

/** The best power for each duration, one column per year (newest first) and one for all time. */
const powerCurveByYear = (details: DetailedActivity[]): {years: number[]; rows: CurveRow[]} => {
  const withCurve = details.filter(({power_curve}) => power_curve);
  const years = [...new Set(withCurve.map(yearOf))].sort((first, second) => second - first);

  const rows = CURVE_DURATIONS.map(([seconds, duration]) => {
    const row: CurveRow = {duration};
    const bestOf = (activities: DetailedActivity[]) =>
      Math.max(0, ...activities.map(({power_curve}) => power_curve?.[seconds] ?? 0)) || null;

    years.forEach(year => (row[year] = bestOf(withCurve.filter(activity => year === yearOf(activity)))));
    row.all = bestOf(withCurve);

    return row;
  });

  return {years, rows};
};

/** Normalized power per heartbeat, ride by ride: it rises as the same effort costs less. */
const aerobicEfficiency = (
  details: DetailedActivity[],
): {date: number; id: number; name: string; efficiency: number}[] =>
  details
    .map(activity => ({activity, power: extractNormalizedPower(activity), heartRate: activity.average_heartrate ?? 0}))
    .filter(({power, heartRate}) => null !== power && 0 < heartRate)
    .map(({activity, power, heartRate}) => ({
      date: new Date(activity.start_date).getTime(),
      id: activity.id,
      name: activity.name,
      efficiency: Math.round(((power ?? 0) / heartRate) * 100) / 100,
    }))
    .sort((first, second) => first.date - second.date);

/** Hours in each power zone, week by week, for the last weeks (the FTP of the day sets the zones). */
const zonesPerWeek = (
  details: DetailedActivity[],
  getFtp: GetFtp,
  weeks: number,
  now: Date,
): Record<string, number | string>[] => {
  // Weeks start on Monday, as everywhere else in Statva.
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const first = monday.getTime() - (weeks - 1) * WEEK_MS;
  const rows = Array.from({length: weeks}, (_, index) => {
    const start = new Date(first + index * WEEK_MS);
    const row: Record<string, number | string> = {week: start.toISOString().slice(0, 10)};
    for (let zone = 1; zone <= ZONE_COUNT; zone++) row[`z${zone}`] = 0;

    return row;
  });

  for (const activity of details) {
    const started = new Date(activity.start_date).getTime();
    const ftp = getFtp(new Date(activity.start_date));
    const index = Math.floor((started - first) / WEEK_MS);

    if (!activity.power_histogram || 0 >= ftp || index < 0 || index >= weeks) continue;

    activity.power_histogram.forEach((seconds, band) => {
      // Zero watts is coasting, not a zone.
      const zone = getPowerZone((band + 0.5) * POWER_BAND_WATTS, ftp);
      if (0 < zone && 0 < seconds) rows[index][`z${zone}`] = Number(rows[index][`z${zone}`]) + seconds / 3600;
    });
  }

  return rows;
};

/** Heart rate drift of each long ride, oldest first. */
const driftByRide = (details: DetailedActivity[]): {date: number; id: number; name: string; drift: number}[] =>
  details
    .filter(({heart_rate_drift}) => null !== (heart_rate_drift ?? null))
    .map(({start_date, id, name, heart_rate_drift}) => ({
      date: new Date(start_date).getTime(),
      id,
      name,
      drift: heart_rate_drift ?? 0,
    }))
    .sort((first, second) => first.date - second.date);

type BestEffort = {name: string; elapsed_time: number};
type RunBest = {
  distance: string;
  byYear: Record<number, {seconds: number; id: number} | null>;
  best: {seconds: number; id: number; year: number} | null;
};

/** The fastest time over each distance in first year, from Strava's best efforts on every run. */
const runBestTimes = (details: DetailedActivity[]): {years: number[]; rows: RunBest[]} => {
  const runs = details.filter(({sport_type}) => 'Run' === sport_type || 'TrailRun' === sport_type);
  const efforts = runs.flatMap(run =>
    ((run as DetailedActivity & {best_efforts?: BestEffort[]}).best_efforts ?? []).map(effort => ({
      ...effort,
      id: run.id,
      year: yearOf(run),
    })),
  );
  const years = [...new Set(efforts.map(({year}) => year))].sort((first, second) => second - first);

  const rows = RUN_DISTANCES.map(distance => {
    const ofDistance = efforts.filter(({name}) => distance === name);
    const fastest = (list: typeof ofDistance) =>
      list.reduce(
        (best: (typeof ofDistance)[number] | null, effort) =>
          null === best || effort.elapsed_time < best.elapsed_time ? effort : best,
        null,
      );
    const byYear = Object.fromEntries(
      years.map(year => {
        const best = fastest(ofDistance.filter(effort => year === effort.year));
        return [year, null === best ? null : {seconds: best.elapsed_time, id: best.id}];
      }),
    );
    const best = fastest(ofDistance);

    return {distance, byYear, best: null === best ? null : {seconds: best.elapsed_time, id: best.id, year: best.year}};
  }).filter(({best}) => null !== best);

  return {years, rows};
};

type CommuteRoute = {
  name: string;
  count: number;
  distance: number;
  bestSpeed: number;
  bestId: number;
  medianSpeed: number;
  lastSpeed: number;
  rides: {date: number; id: number; speed: number}[];
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  return 0 === sorted.length ? 0 : sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * Commutes grouped by name, as riders name a route the same way every time ("Home 🏠"),
 * with the speeds on it over time. Routes ridden only once or twice are left out.
 */
const commuteRoutes = (activities: Activity[], minRides = 3): CommuteRoute[] =>
  Object.values(
    activities
      .filter(({commute, distance, moving_time}) => commute && 0 < distance && 0 < moving_time)
      .reduce((routes: Record<string, Activity[]>, activity) => {
        (routes[activity.name.trim()] ??= []).push(activity);
        return routes;
      }, {}),
  )
    .filter(rides => rides.length >= minRides)
    .map(rides => {
      const dated = rides
        .map(({start_date, id, average_speed}) => ({date: new Date(start_date).getTime(), id, speed: average_speed}))
        .sort((first, second) => first.date - second.date);
      const best = dated.reduce((fastest, ride) => (ride.speed > fastest.speed ? ride : fastest));

      return {
        name: rides[0].name.trim(),
        count: rides.length,
        distance: rides.reduce((sum, {distance}) => sum + distance, 0),
        bestSpeed: best.speed,
        bestId: best.id,
        medianSpeed: median(dated.map(({speed}) => speed)),
        lastSpeed: dated[dated.length - 1].speed,
        rides: dated,
      };
    })
    .sort((first, second) => second.count - first.count);

export {aerobicEfficiency, commuteRoutes, CURVE_DURATIONS, driftByRide, powerCurveByYear, runBestTimes, zonesPerWeek};
export type {CommuteRoute, CurveRow, RunBest};
