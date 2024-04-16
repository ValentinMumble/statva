import {
  SortType,
  formatDistance,
  formatElevation,
  formatDuration,
  formatSpeed,
  getHeartZone,
  getPowerZone,
  KJ_TO_CAL_RATIO,
} from '../models';
import {DetailedActivity, DetailedAthlete} from './strava';

type Tag = {
  label: (activity: DetailedActivity) => string | number;
  isRelevant: (activity: DetailedActivity) => boolean;
  tooltip?: (activity: DetailedActivity, athlete: DetailedAthlete | null) => string | number | null;
  sortType: SortType;
  emoji: string;
  help: string;
};

const TAGS: Tag[] = [
  {
    label: ({distance}) => formatDistance(distance, 0),
    isRelevant: ({distance}) => 0 < distance,
    tooltip: ({distance}) => `🗺️ ${formatDistance(distance, 2)}`,
    sortType: 'distance',
    emoji: '🗺️',
    help: 'Distance',
  },
  {
    label: ({total_elevation_gain}) => formatElevation(total_elevation_gain),
    isRelevant: ({total_elevation_gain}) => 0 < total_elevation_gain,
    sortType: 'elevation',
    emoji: '⛰️',
    help: 'D+',
  },
  {
    label: ({total_elevation_gain, distance}) => `${((total_elevation_gain / distance) * 100).toFixed(2)}%`,
    isRelevant: ({total_elevation_gain, distance}) => 0 < total_elevation_gain / distance,
    sortType: 'elevation_percent',
    emoji: '⚖️',
    help: 'D+ percentage',
  },
  {
    label: ({moving_time}) => formatDuration(moving_time),
    isRelevant: ({moving_time}) => 0 < moving_time,
    sortType: 'duration',
    emoji: '⏱️',
    help: 'Moving time',
  },
  {
    label: ({elapsed_time}) => formatDuration(elapsed_time),
    isRelevant: ({elapsed_time}) => 0 < elapsed_time,
    sortType: 'elapsed_time',
    emoji: '⏳',
    help: 'Elapsed time',
  },
  {
    label: ({average_speed}) => formatSpeed(average_speed),
    isRelevant: ({average_speed}) => 0 < average_speed,
    tooltip: ({average_speed}) => `🏁 ${formatSpeed(average_speed, 3)}`,
    sortType: 'average_speed',
    emoji: '🏁',
    help: 'Average speed',
  },
  {
    label: ({max_speed}) => formatSpeed(max_speed),
    isRelevant: ({max_speed}) => 0 < max_speed,
    sortType: 'max_speed',
    emoji: '🚀',
    help: 'Max speed',
  },
  {
    label: ({average_watts}) => `${Math.round(average_watts ?? 0)} W`,
    isRelevant: ({average_watts}) => 0 < (average_watts ?? 0),
    tooltip: (activity, athlete) => `⚡️ Zone ${getPowerZone(activity, athlete?.ftp ?? 0)}`,
    sortType: 'average_watts',
    emoji: '⚡️',
    help: 'Average power',
  },
  {
    label: ({weighted_average_watts}) => `${Math.round(weighted_average_watts ?? 0)} W`,
    isRelevant: ({weighted_average_watts}) => 0 < (weighted_average_watts ?? 0),
    sortType: 'weighted_average_watts',
    emoji: '🏋️',
    help: 'Weighted average power',
  },
  {
    label: ({max_watts}) => `${Math.round(max_watts ?? 0)} W`,
    isRelevant: ({max_watts}) => 0 < (max_watts ?? 0),
    sortType: 'max_watts',
    emoji: '💥',
    help: 'Max power',
  },
  {
    label: ({suffer_score}) => Math.round(suffer_score ?? 0),
    isRelevant: ({suffer_score}) => 0 < (suffer_score ?? 0),
    sortType: 'suffer_score',
    emoji: '🌶️',
    help: 'Suffer score',
  },
  {
    label: ({kilojoules}) => `${Math.round(kilojoules * KJ_TO_CAL_RATIO)} kcal`,
    isRelevant: ({kilojoules}) => 0 < kilojoules,
    sortType: 'kilojoules',
    emoji: '🍕',
    help: 'Calories burned',
  },
  {
    label: ({average_cadence}) => Math.round(average_cadence ?? 0),
    isRelevant: ({average_cadence}) => 0 < (average_cadence ?? 0),
    sortType: 'average_cadence',
    emoji: '🎡',
    help: 'Average cadence',
  },
  {
    label: ({average_heartrate}) => Math.round(average_heartrate ?? 0),
    isRelevant: ({average_heartrate}) => 0 < (average_heartrate ?? 0),
    tooltip: activity => `🫀 Zone ${getHeartZone(activity)}`,
    sortType: 'average_heartrate',
    emoji: '🫀',
    help: 'Average heartrate',
  },
  {
    label: ({max_heartrate}) => Math.round(max_heartrate ?? 0),
    isRelevant: ({max_heartrate}) => 0 < (max_heartrate ?? 0),
    sortType: 'max_heartrate',
    emoji: '💓',
    help: 'Max heartrate',
  },
  {
    label: ({pr_count}) => pr_count,
    isRelevant: ({pr_count}) => 0 < pr_count,
    sortType: 'pr_count',
    emoji: '🏆',
    help: 'PR count',
  },
  {
    label: ({kudos_count}) => kudos_count,
    isRelevant: ({kudos_count}) => 0 < kudos_count,
    sortType: 'kudos_count',
    emoji: '👍',
    help: 'Kudos count',
  },
];

export {TAGS};
