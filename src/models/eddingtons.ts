import {getTypes} from './activity';
import {localDay} from './local-day';
import {ActivityType, DetailedActivity} from './strava';

/**
 * Eddington numbers beyond distance, as VeloViewer counts them: the biggest E with E days
 * (or activities) of at least E of something. And dark rides, out before sunrise or still
 * out after sunset.
 */

type Eddington = {number: number; next: number; have: number; needed: number};

type Eddingtons = {
  // E days with at least 20 × E metres climbed.
  climbing: Eddington;
  // E days with at least E minutes of riding.
  minutes: Eddington;
  // E activities with at least E kudos (VeloViewer's K-Index).
  kudos: Eddington;
  // E rides with at least E riders on them, as Strava matched them.
  riders: Eddington;
};

type DarkRides = {
  count: number;
  thisYear: number;
  // Of the outdoor rides with a start point, those out in the dark.
  share: number;
  latest: DetailedActivity | null;
};

// VeloViewer counts climbing in steps of 20 m, so its numbers sit near the distance ones.
const CLIMBING_STEP_M = 20;
const DAY_MS = 86_400_000;

/** The biggest E with at least E values of E or more, and how many more the next one needs. */
const eddingtonOf = (values: number[]): Eddington => {
  const sorted = [...values].sort((first, second) => second - first);
  let number = 0;
  while (number < sorted.length && sorted[number] >= number + 1) number++;
  const next = number + 1;
  const have = sorted.filter(value => value >= next).length;

  return {number, next, have, needed: next - have};
};

const perDay = (activities: DetailedActivity[], value: (activity: DetailedActivity) => number): number[] => {
  const days = new Map<string, number>();
  for (const activity of activities) days.set(localDay(activity), (days.get(localDay(activity)) ?? 0) + value(activity));

  return [...days.values()];
};

const ridesOf = (activities: DetailedActivity[]): DetailedActivity[] => {
  const types: string[] = getTypes(ActivityType.Ride);

  return activities.filter(({sport_type}) => types.includes(sport_type));
};

/** Climbing and minutes count rides by day; kudos count every activity, riders every ride. */
const computeEddingtons = (activities: DetailedActivity[]): Eddingtons => {
  const rides = ridesOf(activities);

  return {
    climbing: eddingtonOf(perDay(rides, ({total_elevation_gain}) => total_elevation_gain / CLIMBING_STEP_M)),
    minutes: eddingtonOf(perDay(rides, ({moving_time}) => moving_time / 60)),
    kudos: eddingtonOf(activities.map(({kudos_count}) => kudos_count ?? 0)),
    riders: eddingtonOf(rides.map(({athlete_count}) => athlete_count ?? 1)),
  };
};

/**
 * Sunrise and sunset (UTC milliseconds) on the day of a moment, at a place, or null where
 * the sun does not rise or set that day. The usual low-precision solar formulas (within a
 * minute or two), with the sun's centre 0.833° below the horizon, as almanacs count it.
 */
const sunTimes = (moment: number, [latitude, longitude]: number[]): {rise: number; set: number} | null => {
  const rad = Math.PI / 180;
  const j1970 = 2440588;
  const j2000 = 2451545;
  const tilt = rad * 23.4397;
  const west = -longitude * rad;
  const days = moment / DAY_MS - 0.5 + j1970 - j2000;
  const cycle = Math.round(days - 0.0009 - west / (2 * Math.PI));
  const transit = 0.0009 + west / (2 * Math.PI) + cycle;
  const anomaly = rad * (357.5291 + 0.98560028 * transit);
  const centre = rad * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly));
  const eclipticLongitude = anomaly + centre + rad * 102.9372 + Math.PI;
  const declination = Math.asin(Math.sin(tilt) * Math.sin(eclipticLongitude));
  const noon = j2000 + transit + 0.0053 * Math.sin(anomaly) - 0.0069 * Math.sin(2 * eclipticLongitude);
  const hourAngle = Math.acos(
    (Math.sin(rad * -0.833) - Math.sin(latitude * rad) * Math.sin(declination)) / (Math.cos(latitude * rad) * Math.cos(declination)),
  );

  if (Number.isNaN(hourAngle)) return null;

  const set = j2000 + 0.0009 + (hourAngle + west) / (2 * Math.PI) + cycle + 0.0053 * Math.sin(anomaly) - 0.0069 * Math.sin(2 * eclipticLongitude);
  const toMs = (julian: number): number => (julian + 0.5 - j1970) * DAY_MS;

  return {rise: toMs(noon - (set - noon)), set: toMs(set)};
};

/** Whether a ride started before sunrise or was still going after sunset, where it started. */
const isDark = ({start_date, elapsed_time, start_latlng, trainer}: DetailedActivity): boolean => {
  if (trainer || 2 !== start_latlng?.length) return false;

  const start = new Date(start_date).getTime();
  const sun = sunTimes(start, start_latlng);

  return null !== sun && (start < sun.rise || start + elapsed_time * 1000 > sun.set);
};

/** Rides out in the dark: how many, this year, their share, and the latest. */
const darkRides = (activities: DetailedActivity[], year: number): DarkRides => {
  const outdoor = ridesOf(activities).filter(({trainer, start_latlng}) => !trainer && 2 === start_latlng?.length);
  const dark = outdoor.filter(isDark).sort((first, second) => new Date(second.start_date).getTime() - new Date(first.start_date).getTime());

  return {
    count: dark.length,
    thisYear: dark.filter(activity => localDay(activity).startsWith(String(year))).length,
    share: 0 === outdoor.length ? 0 : dark.length / outdoor.length,
    latest: dark[0] ?? null,
  };
};

export {CLIMBING_STEP_M, computeEddingtons, darkRides, eddingtonOf, isDark, sunTimes};
export type {DarkRides, Eddington, Eddingtons};
