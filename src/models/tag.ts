import {
  SortType,
  formatDistance,
  formatElevation,
  formatDuration,
  formatSpeed,
  getHeartZone,
  getPowerZone,
  KJ_TO_CAL_RATIO,
  formatPaceOrSpeed,
  getTotalValue,
  formatDurationInDays,
  getMaxValue,
} from '../models';
import {DetailedActivity, DetailedAthlete} from './strava';

type Tag = {
  label: (activity: DetailedActivity, ftp: number) => string | number | null;
  isRelevant: (activity: DetailedActivity) => boolean;
  tooltip?: (activity: DetailedActivity, athlete: DetailedAthlete | null) => string | number | null;
  total: (activities: DetailedActivity[]) => string | number;
  sortType: SortType;
  emoji: string;
  help: string;
};

const TAGS: Tag[] = [
  {
    label: ({distance}) => formatDistance(distance, 0),
    isRelevant: ({distance}) => 0 < distance,
    tooltip: ({distance}) => `🗺️ ${formatDistance(distance, 2)}`,
    total: activities => formatDistance(getTotalValue(activities, 'distance'), 0),
    sortType: 'distance',
    emoji: '🗺️',
    help: 'Distance',
  },
  {
    label: ({total_elevation_gain}) => formatElevation(total_elevation_gain),
    isRelevant: ({total_elevation_gain}) => 0 < total_elevation_gain,
    tooltip: ({total_elevation_gain, distance}) => `⚖️ ${((total_elevation_gain / distance) * 100).toFixed(2)}%`,
    total: activities => formatDistance(getTotalValue(activities, 'total_elevation_gain'), 0),
    sortType: 'elevation',
    emoji: '⛰️',
    help: 'D+',
  },
  {
    label: ({total_elevation_gain, distance}) => `${((total_elevation_gain / distance) * 100).toFixed(2)}%`,
    isRelevant: ({total_elevation_gain, distance}) => 0 < total_elevation_gain / distance,
    total: _activities => '', //TODO
    sortType: 'elevation_percent',
    emoji: '⚖️',
    help: 'D+ percentage',
  },
  {
    label: ({moving_time}) => formatDuration(moving_time),
    isRelevant: ({moving_time}) => 0 < moving_time,
    tooltip: ({elapsed_time}) => `⏳ ${formatDuration(elapsed_time)}`,
    total: activities => formatDurationInDays(getTotalValue(activities, 'moving_time')),
    sortType: 'duration',
    emoji: '⏱️',
    help: 'Moving time',
  },
  {
    label: ({elapsed_time}) => formatDuration(elapsed_time),
    isRelevant: ({elapsed_time}) => 0 < elapsed_time,
    total: activities => formatDurationInDays(getTotalValue(activities, 'elapsed_time')),
    sortType: 'elapsed_time',
    emoji: '⏳',
    help: 'Elapsed time',
  },
  {
    label: formatPaceOrSpeed,
    isRelevant: ({average_speed}) => 0 < average_speed,
    tooltip: ({average_speed}) => `🏁 ${formatSpeed(average_speed, 3)}`,
    total: activities =>
      // TODO extract getAvgValue()
      formatSpeed(
        activities.reduce(
          (total, activity, _index, activities) => total + activity.average_speed / activities.length,
          0
        )
      ),
    sortType: 'average_speed',
    emoji: '🏁',
    help: 'Average speed',
  },
  {
    label: ({max_speed}) => formatSpeed(max_speed),
    isRelevant: ({max_speed}) => 0 < max_speed,
    total: activities => formatSpeed(getMaxValue(activities, 'max_speed')),
    sortType: 'max_speed',
    emoji: '🚀',
    help: 'Max speed',
  },
  {
    label: ({average_watts}) => (undefined === average_watts ? null : `${Math.round(average_watts)} W`),
    isRelevant: ({average_watts}) => 0 < (average_watts ?? 0),
    tooltip: ({weighted_average_watts, average_watts}, athlete) =>
      undefined === weighted_average_watts
        ? null
        : `🏋️ ${Math.round(weighted_average_watts)} W 〰 Zone ${getPowerZone(average_watts ?? 0, athlete?.ftp ?? 0)}`,
    total: _activities => '', //TODO
    sortType: 'average_watts',
    emoji: '⚡️',
    help: 'Average power',
  },
  {
    label: ({weighted_average_watts}) =>
      undefined === weighted_average_watts ? null : `${Math.round(weighted_average_watts)} W`,
    isRelevant: ({weighted_average_watts}) => 0 < (weighted_average_watts ?? 0),
    tooltip: ({average_watts, weighted_average_watts}, athlete) =>
      undefined === average_watts
        ? null
        : `⚡️ ${Math.round(average_watts)} W 〰 Zone ${getPowerZone(weighted_average_watts ?? 0, athlete?.ftp ?? 0)}`,
    total: _activities => '', //TODO
    sortType: 'weighted_average_watts',
    emoji: '🏋️',
    help: 'Weighted average power',
  },
  {
    label: ({max_watts}) => (undefined === max_watts ? null : `${Math.round(max_watts)} W`),
    isRelevant: ({max_watts}) => 0 < (max_watts ?? 0),
    total: activities => `${getMaxValue(activities, 'max_watts')} W`,
    sortType: 'max_watts',
    emoji: '💥',
    help: 'Max power',
  },
  {
    label: ({suffer_score}) => (undefined === suffer_score ? null : Math.round(suffer_score)),
    isRelevant: ({suffer_score}) => 0 < (suffer_score ?? 0),
    total: _activities => '', //TODO
    sortType: 'suffer_score',
    emoji: '🌶️',
    help: 'Suffer score',
  },
  {
    label: ({weighted_average_watts}, ftp) =>
      undefined === weighted_average_watts ? null : `${Math.round((weighted_average_watts / ftp) * 100)}%`,
    isRelevant: ({weighted_average_watts}) => 0 < (weighted_average_watts ?? 0),
    total: _activities => '', //TODO
    sortType: 'intensity',
    emoji: '🔋',
    help: 'Intensity',
  },
  {
    label: ({kilojoules}) => (undefined === kilojoules ? null : `${Math.round(kilojoules * KJ_TO_CAL_RATIO)} kcal`),
    isRelevant: ({kilojoules}) => 0 < (kilojoules ?? 0),
    total: activities => Math.round(getTotalValue(activities, 'kilojoules')),
    sortType: 'kilojoules',
    emoji: '🍕',
    help: 'Calories burned',
  },
  {
    label: ({average_cadence}) => (undefined === average_cadence ? null : Math.round(average_cadence)),
    isRelevant: ({average_cadence}) => 0 < (average_cadence ?? 0),
    total: _activities => '', //TODO
    sortType: 'average_cadence',
    emoji: '🎡',
    help: 'Average cadence',
  },
  {
    label: ({average_heartrate}) => (undefined === average_heartrate ? null : Math.round(average_heartrate)),
    isRelevant: ({average_heartrate}) => 0 < (average_heartrate ?? 0),
    tooltip: activity => `🫀 Zone ${getHeartZone(activity)}`,
    total: _activities => '', //TODO
    sortType: 'average_heartrate',
    emoji: '🫀',
    help: 'Average heartrate',
  },
  {
    label: ({max_heartrate}) => (undefined === max_heartrate ? null : Math.round(max_heartrate)),
    isRelevant: ({max_heartrate}) => 0 < (max_heartrate ?? 0),
    total: activities => getMaxValue(activities, 'max_heartrate'),
    sortType: 'max_heartrate',
    emoji: '💓',
    help: 'Max heartrate',
  },
  {
    label: ({average_temp}) => (undefined === average_temp ? null : `${Math.round(average_temp)} °C`),
    isRelevant: ({average_temp}) => undefined !== average_temp,
    total: _activities => '', //TODO
    sortType: 'average_temp',
    emoji: '🌡️',
    help: 'Average temperature',
  },
  {
    label: ({pr_count}) => pr_count,
    isRelevant: ({pr_count}) => 0 < pr_count,
    total: activities => getTotalValue(activities, 'pr_count'),
    sortType: 'pr_count',
    emoji: '🏆',
    help: 'PR count',
  },
  {
    label: ({achievement_count}) => achievement_count,
    isRelevant: ({achievement_count}) => 0 < achievement_count,
    total: activities => getTotalValue(activities, 'achievement_count'),
    sortType: 'achievement_count',
    emoji: '🎖️',
    help: 'Achievement count',
  },
  {
    label: ({athlete_count}) => athlete_count,
    isRelevant: ({athlete_count}) => 1 < athlete_count,
    total: _activities => '', //TODO
    sortType: 'athlete_count',
    emoji: '🧑‍🤝‍🧑',
    help: 'Athlete count',
  },
  {
    label: ({kudos_count}) => kudos_count,
    isRelevant: ({kudos_count}) => 0 < kudos_count,
    total: activities => getTotalValue(activities, 'kudos_count'),
    sortType: 'kudos_count',
    emoji: '👍',
    help: 'Kudos count',
  },
  {
    label: ({total_photo_count}) => total_photo_count,
    isRelevant: ({total_photo_count}) => 0 < total_photo_count,
    total: activities => getTotalValue(activities, 'total_photo_count'),
    sortType: 'photo_count',
    emoji: '🖼️',
    help: 'Photo count',
  },
];

export {TAGS};
