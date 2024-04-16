import {DetailedActivity} from './strava';

type SortType =
  | 'average_cadence'
  | 'average_heartrate'
  | 'average_speed'
  | 'average_watts'
  | 'date'
  | 'distance'
  | 'duration'
  | 'elevation'
  | 'elevation_percent'
  | 'kilojoules'
  | 'kudos_count'
  | 'max_heartrate'
  | 'max_speed'
  | 'max_watts'
  | 'pr_count'
  | 'suffer_score'
  | 'weighted_average_watts';

type SortDirection = 'asc' | 'desc';

const DEFAULT_SORTS: SortType[] = [
  'average_cadence',
  'average_heartrate',
  'average_speed',
  'average_watts',
  'distance',
  'duration',
  'elevation',
  'kilojoules',
  'max_speed',
  'pr_count',
  'suffer_score',
];

const sortActivities = (sortType: SortType, sortDirection: SortDirection, a: DetailedActivity, b: DetailedActivity) => {
  const [first, second] = 'desc' === sortDirection ? [a, b] : [b, a];

  switch (sortType) {
    case 'average_cadence':
      return (second.average_cadence ?? 0) - (first.average_cadence ?? 0);
    case 'average_heartrate':
      return (second.average_heartrate ?? 0) - (first.average_heartrate ?? 0);
    case 'average_speed':
      return second.average_speed - first.average_speed;
    case 'average_watts':
      return (second.average_watts ?? 0) - (first.average_watts ?? 0);
    case 'date':
      return first.start_date < second.start_date ? 1 : -1;
    case 'distance':
      return second.distance - first.distance;
    case 'duration':
      return second.moving_time - first.moving_time;
    case 'elevation':
      return second.total_elevation_gain - first.total_elevation_gain;
    case 'elevation_percent':
      return second.total_elevation_gain / second.distance - first.total_elevation_gain / first.distance;
    case 'kilojoules':
      return second.kilojoules - first.kilojoules;
    case 'kudos_count':
      return second.kudos_count - first.kudos_count;
    case 'max_heartrate':
      return (second.max_heartrate ?? 0) - (first.max_heartrate ?? 0);
    case 'max_speed':
      return second.max_speed - first.max_speed;
    case 'max_watts':
      return (second.max_watts ?? 0) - (first.max_watts ?? 0);
    case 'pr_count':
      return second.pr_count - first.pr_count;
    case 'suffer_score':
      return (second.suffer_score ?? 0) - (first.suffer_score ?? 0);
    case 'weighted_average_watts':
      return (second.weighted_average_watts ?? 0) - (first.weighted_average_watts ?? 0);
  }
};

export {DEFAULT_SORTS, sortActivities};
export type {SortDirection, SortType};
