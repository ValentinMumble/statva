import {extractNormalizedPower, GetFtp, computeTSS} from '../models';
import {Activity, DetailedActivity} from './strava';

type SortType =
  | 'achievement_count'
  | 'athlete_count'
  | 'average_cadence'
  | 'average_heartrate'
  | 'average_speed'
  | 'average_temp'
  | 'average_watts'
  | 'date'
  | 'distance'
  | 'elapsed_time'
  | 'elevation_percent'
  | 'intensity'
  | 'kilojoules'
  | 'kudos_count'
  | 'max_heartrate'
  | 'max_speed'
  | 'max_watts'
  | 'moving_time'
  | 'normalized_power'
  | 'photo_count'
  | 'pr_count'
  | 'suffer_score'
  | 'total_elevation_gain'
  | 'tss'
  | 'weighted_average_watts';

type SortDirection = 'asc' | 'desc';

const DEFAULT_SORTS: SortType[] = [
  'average_cadence',
  'average_heartrate',
  'average_speed',
  'distance',
  'total_elevation_gain',
  'max_speed',
  'moving_time',
  'normalized_power',
  'suffer_score',
];

type SortContext = {activity: Activity; detailed: DetailedActivity | null; getFtp: GetFtp};

const sortValueGetters: Record<SortType, (ctx: SortContext) => number | null> = {
  achievement_count: ({activity}) => activity.achievement_count,
  athlete_count: ({activity}) => activity.athlete_count,
  average_cadence: ({activity}) => activity.average_cadence ?? 0,
  average_heartrate: ({activity}) => activity.average_heartrate ?? 0,
  average_speed: ({activity}) => activity.average_speed,
  average_temp: ({activity}) => activity.average_temp ?? null,
  average_watts: ({activity}) => activity.average_watts ?? 0,
  date: ({activity}) => new Date(activity.start_date).getTime(),
  distance: ({activity}) => activity.distance,
  elapsed_time: ({activity}) => activity.elapsed_time,
  elevation_percent: ({activity}) => activity.distance === 0 ? null : activity.total_elevation_gain / activity.distance,
  intensity: ({activity, getFtp}) => (activity.weighted_average_watts ?? 0) / getFtp(new Date(activity.start_date)),
  kilojoules: ({activity}) => activity.kilojoules ?? 0,
  kudos_count: ({activity}) => activity.kudos_count,
  max_heartrate: ({activity}) => activity.max_heartrate ?? 0,
  max_speed: ({activity}) => activity.max_speed,
  max_watts: ({activity}) => activity.max_watts ?? 0,
  moving_time: ({activity}) => activity.moving_time,
  normalized_power: ({detailed}) => extractNormalizedPower(detailed) ?? null,
  photo_count: ({activity}) => activity.total_photo_count,
  pr_count: ({activity}) => activity.pr_count,
  suffer_score: ({activity}) => activity.suffer_score ?? 0,
  total_elevation_gain: ({activity}) => activity.total_elevation_gain,
  tss: ({activity, getFtp}) => computeTSS(activity, getFtp(new Date(activity.start_date)))?.value ?? 0,
  weighted_average_watts: ({activity}) => activity.weighted_average_watts ?? 0,
};

const sortActivities = (
  sortType: SortType,
  sortDirection: SortDirection,
  a: Activity,
  b: Activity,
  da: DetailedActivity | null,
  db: DetailedActivity | null,
  getFtp: GetFtp
) => {
  const getValue = sortValueGetters[sortType];
  const valA = getValue({activity: a, detailed: da, getFtp});
  const valB = getValue({activity: b, detailed: db, getFtp});

  if (valA === null) return sortDirection === 'desc' ? 1 : -1;
  if (valB === null) return sortDirection === 'desc' ? -1 : 1;

  return sortDirection === 'desc' ? valB - valA : valA - valB;
};

export {DEFAULT_SORTS, sortActivities};
export type {SortDirection, SortType};
