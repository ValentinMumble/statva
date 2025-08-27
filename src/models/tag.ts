import {
  SortType,
  formatDistance,
  formatDuration,
  formatSpeed,
  getHeartZone,
  getPowerZone,
  formatPaceOrSpeed,
  getTotalValue,
  formatDurationInDays,
  getMaxValue,
  getAverageValue,
  formatPower,
  GetFtp,
  formatPercent,
  formatLaps,
  guessCalories,
  extractNormalizedPower,
  formatDistanceMeters,
  getZoneColor,
} from '../models';
import {ActivityType, Activity, DetailedActivity} from './strava';

type Tag = {
  label: (activity: Activity, fullActivity: DetailedActivity | null, ftp: number) => string | number | null;
  isRelevant: (activity: Activity, fullActivity: DetailedActivity | null) => boolean;
  tooltip?: (activity: Activity, ftp: number) => string | number | null;
  total: (activities: Activity[], getFtp: GetFtp) => string | number;
  colorPalette?: (activity: Activity, fullActivity: DetailedActivity | null, ftp: number) => string | undefined;
  sortType: SortType;
  help: string;
  excludedTypes?: ActivityType[];
};

const TAGS: Tag[] = [
  {
    help: 'Distance',
    label: ({distance, sport_type}) =>
      ActivityType.Swim === sport_type ? formatDistanceMeters(distance) : formatDistance(distance),
    isRelevant: ({distance}) => 0 < distance,
    tooltip: ({distance}) => `📍 ${formatDistance(distance, 2)}`,
    total: activities => formatDistance(getTotalValue(activities, 'distance')),
    sortType: 'distance',
    excludedTypes: [ActivityType.Yoga],
  },
  {
    help: 'D+',
    label: activity =>
      ActivityType.Swim === activity.sport_type
        ? formatLaps(activity)
        : formatDistanceMeters(activity.total_elevation_gain),
    isRelevant: ({total_elevation_gain, sport_type}) => ActivityType.Swim === sport_type || 0 < total_elevation_gain,
    tooltip: ({total_elevation_gain, distance, sport_type}) =>
      ActivityType.Swim === sport_type ? null : `⚖️ ${formatPercent(total_elevation_gain / distance, 2)}`,
    total: activities => formatDistance(getTotalValue(activities, 'total_elevation_gain')),
    sortType: 'total_elevation_gain',
    excludedTypes: [ActivityType.Tennis, ActivityType.Yoga],
  },
  {
    help: 'D+ percentage',
    label: ({total_elevation_gain, distance}) => formatPercent(total_elevation_gain / distance, 2),
    isRelevant: ({total_elevation_gain, distance}) => 0 < total_elevation_gain / distance,
    total: activities =>
      formatPercent(getTotalValue(activities, 'total_elevation_gain') / getTotalValue(activities, 'distance'), 2),
    sortType: 'elevation_percent',
    excludedTypes: [ActivityType.Swim, ActivityType.Tennis, ActivityType.Yoga],
  },
  {
    help: 'Moving time',
    label: ({moving_time}) => formatDuration(moving_time),
    isRelevant: ({moving_time}) => 0 < moving_time,
    tooltip: ({elapsed_time}) => `⏳ ${formatDuration(elapsed_time)}`,
    total: activities => formatDurationInDays(getTotalValue(activities, 'moving_time')),
    sortType: 'moving_time',
  },
  {
    help: 'Elapsed time',
    label: ({elapsed_time}) => formatDuration(elapsed_time),
    isRelevant: ({elapsed_time}) => 0 < elapsed_time,
    total: activities => formatDurationInDays(getTotalValue(activities, 'elapsed_time')),
    sortType: 'elapsed_time',
  },
  {
    help: 'Average speed',
    label: activity => formatPaceOrSpeed(activity),
    isRelevant: ({average_speed}) => 0 < average_speed,
    tooltip: activity => `🏁 ${formatPaceOrSpeed(activity, 3, true)}`,
    total: activities => formatSpeed(getAverageValue(activities, 'average_speed')),
    sortType: 'average_speed',
    excludedTypes: [ActivityType.Tennis],
  },
  {
    help: 'Max speed',
    label: ({max_speed}) => formatSpeed(max_speed),
    isRelevant: ({max_speed}) => 0 < max_speed,
    total: activities => formatSpeed(getMaxValue(activities, 'max_speed')),
    sortType: 'max_speed',
    excludedTypes: [ActivityType.Tennis, ActivityType.Swim, ActivityType.Hike, ActivityType.Yoga],
  },
  {
    help: 'Average power',
    label: ({average_watts}) => (undefined === average_watts ? null : formatPower(average_watts)),
    isRelevant: ({average_watts}) => 0 < (average_watts ?? 0),
    tooltip: ({weighted_average_watts, average_watts}, ftp) =>
      undefined === weighted_average_watts
        ? null
        : `🏋️ ${formatPower(weighted_average_watts)} 〰 Zone ${getPowerZone(average_watts ?? 0, ftp)}`,
    total: activities => formatPower(getAverageValue(activities, 'average_watts')),
    sortType: 'average_watts',
  },
  {
    help: 'Weighted average power',
    label: ({weighted_average_watts}) =>
      undefined === weighted_average_watts ? null : formatPower(weighted_average_watts),
    isRelevant: ({weighted_average_watts}) => 0 < (weighted_average_watts ?? 0),
    tooltip: ({average_watts, weighted_average_watts}, ftp) =>
      undefined === average_watts
        ? null
        : `⚡️ ${formatPower(average_watts)} 〰 Zone ${getPowerZone(weighted_average_watts ?? 0, ftp)}`,
    total: activities => formatPower(getAverageValue(activities, 'weighted_average_watts')),
    sortType: 'weighted_average_watts',
  },
  {
    help: 'Normalized power',
    label: (_, fullActivity) => {
      const np = extractNormalizedPower(fullActivity);

      return null === np ? null : formatPower(np);
    },
    isRelevant: (_, fullActivity) => null !== fullActivity && 0 < (extractNormalizedPower(fullActivity) ?? 0),
    total: activities => formatPower(getAverageValue(activities, 'weighted_average_watts')), //TODO
    sortType: 'normalized_power',
    colorPalette: (_, fullActivity, ftp) => getZoneColor(getPowerZone(extractNormalizedPower(fullActivity) ?? 0, ftp)),
  },
  {
    help: 'Max power',
    label: ({max_watts}) => (undefined === max_watts ? null : formatPower(max_watts)),
    isRelevant: ({max_watts}) => 0 < (max_watts ?? 0),
    total: activities => formatPower(getMaxValue(activities, 'max_watts')),
    sortType: 'max_watts',
  },
  {
    help: 'Intensity',
    label: ({weighted_average_watts}, _, ftp) =>
      undefined === weighted_average_watts ? null : formatPercent(weighted_average_watts / ftp),
    isRelevant: ({weighted_average_watts}) => 0 < (weighted_average_watts ?? 0),
    total: (activities, getFtp) =>
      formatPercent(
        activities
          .filter(activity => undefined !== activity.weighted_average_watts)
          .reduce(
            (total, activity, _index, activities) =>
              total +
              (activity.weighted_average_watts ?? 0) / getFtp(new Date(activity.start_date)) / activities.length,
            0
          )
      ),
    sortType: 'intensity',
  },
  {
    help: 'Average heartrate',
    label: ({average_heartrate}) => (undefined === average_heartrate ? null : Math.round(average_heartrate)),
    isRelevant: ({average_heartrate}) => 0 < (average_heartrate ?? 0),
    tooltip: activity => `🫀 Zone ${getHeartZone(activity)}`,
    total: activities => Math.round(getAverageValue(activities, 'average_heartrate')),
    sortType: 'average_heartrate',
    colorPalette: activity => getZoneColor(getHeartZone(activity)),
  },
  {
    help: 'Max heartrate',
    label: ({max_heartrate}) => (undefined === max_heartrate ? null : Math.round(max_heartrate)),
    isRelevant: ({max_heartrate}) => 0 < (max_heartrate ?? 0),
    total: activities => getMaxValue(activities, 'max_heartrate'),
    sortType: 'max_heartrate',
  },
  {
    help: 'Suffer score',
    label: ({suffer_score}) => (undefined === suffer_score ? null : Math.round(suffer_score)),
    isRelevant: ({suffer_score}) => 0 < (suffer_score ?? 0),
    total: activities => Math.round(getAverageValue(activities, 'suffer_score')),
    sortType: 'suffer_score',
  },
  {
    help: 'Calories burned',
    label: guessCalories,
    isRelevant: ({kilojoules}) => 0 < (kilojoules ?? 0),
    total: activities => Math.round(getTotalValue(activities, 'kilojoules')),
    sortType: 'kilojoules',
  },
  {
    help: 'Average cadence',
    label: ({average_cadence}) => (undefined === average_cadence ? null : Math.round(average_cadence)),
    isRelevant: ({average_cadence}) => 0 < (average_cadence ?? 0),
    total: activities => Math.round(getAverageValue(activities, 'average_cadence')),
    sortType: 'average_cadence',
  },
  {
    help: 'Average temperature',
    label: ({average_temp}) => (undefined === average_temp ? null : `${Math.round(average_temp)} °C`),
    isRelevant: ({average_temp}) => undefined !== average_temp,
    total: activities => `${Math.round(getAverageValue(activities, 'average_temp'))} °C`,
    sortType: 'average_temp',
  },
  {
    help: 'PR count',
    label: ({pr_count}) => pr_count,
    isRelevant: ({pr_count}) => 0 < pr_count,
    total: activities => getTotalValue(activities, 'pr_count'),
    sortType: 'pr_count',
  },
  {
    help: 'Achievement count',
    label: ({achievement_count}) => achievement_count,
    isRelevant: ({achievement_count}) => 0 < achievement_count,
    total: activities => getTotalValue(activities, 'achievement_count'),
    sortType: 'achievement_count',
  },
  {
    help: 'Athlete count',
    label: ({athlete_count}) => athlete_count,
    isRelevant: ({athlete_count}) => 1 < athlete_count,
    total: activities => Math.round(getAverageValue(activities, 'athlete_count')),
    sortType: 'athlete_count',
  },
  {
    help: 'Kudos count',
    label: ({kudos_count}) => kudos_count,
    isRelevant: ({kudos_count}) => 0 < kudos_count,
    total: activities => getTotalValue(activities, 'kudos_count'),
    sortType: 'kudos_count',
  },
  {
    help: 'Photo count',
    label: ({total_photo_count}) => total_photo_count,
    isRelevant: ({total_photo_count}) => 0 < total_photo_count,
    total: activities => getTotalValue(activities, 'total_photo_count'),
    sortType: 'photo_count',
  },
];

export {TAGS};
