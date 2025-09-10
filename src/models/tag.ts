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
  sortType: SortType;
  help: string;
  excludedTypes?: ActivityType[];
  value: (
    activity: Activity,
    fullActivity: DetailedActivity | null,
    ftp: number
  ) => {
    label: string | number | null;
    isRelevant: boolean;
    tooltip?: string | number | null;
    colorPalette?: string;
  };
  total: (activities: Activity[], activityMeta: Record<string, DetailedActivity>, getFtp: GetFtp) => string | number;
};

const TAGS: Tag[] = [
  {
    help: 'Distance',
    value: ({distance, sport_type}) => ({
      label: ActivityType.Swim === sport_type ? formatDistanceMeters(distance) : formatDistance(distance),
      isRelevant: 0 < distance,
      tooltip: `📍 ${formatDistance(distance, 2)}`,
    }),
    total: activities => formatDistance(getTotalValue(activities, 'distance')),
    sortType: 'distance',
    excludedTypes: [ActivityType.Yoga],
  },
  {
    help: 'D+',
    value: activity => ({
      label:
        ActivityType.Swim === activity.sport_type
          ? formatLaps(activity)
          : formatDistanceMeters(activity.total_elevation_gain),
      isRelevant: ActivityType.Swim === activity.sport_type || 0 < activity.total_elevation_gain,
      tooltip:
        ActivityType.Swim === activity.sport_type
          ? null
          : `⚖️ ${formatPercent(activity.total_elevation_gain / activity.distance, 2)}`,
    }),
    total: activities => formatDistance(getTotalValue(activities, 'total_elevation_gain')),
    sortType: 'total_elevation_gain',
    excludedTypes: [ActivityType.Tennis, ActivityType.Yoga],
  },
  {
    help: 'D+ percentage',
    value: ({total_elevation_gain, distance}) => ({
      label: formatPercent(total_elevation_gain / distance, 2),
      isRelevant: 0 < total_elevation_gain / distance,
    }),
    total: activities =>
      formatPercent(getTotalValue(activities, 'total_elevation_gain') / getTotalValue(activities, 'distance'), 2),
    sortType: 'elevation_percent',
    excludedTypes: [ActivityType.Swim, ActivityType.Tennis, ActivityType.Yoga],
  },
  {
    help: 'Moving time',
    value: ({moving_time, elapsed_time}) => ({
      label: formatDuration(moving_time),
      isRelevant: 0 < moving_time,
      tooltip: `⏳ ${formatDuration(elapsed_time)}`,
    }),
    total: activities => formatDurationInDays(getTotalValue(activities, 'moving_time')),
    sortType: 'moving_time',
  },
  {
    help: 'Elapsed time',
    value: ({elapsed_time}) => ({
      label: formatDuration(elapsed_time),
      isRelevant: 0 < elapsed_time,
    }),
    total: activities => formatDurationInDays(getTotalValue(activities, 'elapsed_time')),
    sortType: 'elapsed_time',
  },
  {
    help: 'Average speed',
    value: activity => ({
      label: formatPaceOrSpeed(activity),
      isRelevant: 0 < activity.average_speed,
      tooltip: `🏁 ${formatPaceOrSpeed(activity, 3, true)}`,
    }),
    total: activities => formatSpeed(getAverageValue(activities, 'average_speed')),
    sortType: 'average_speed',
    excludedTypes: [ActivityType.Tennis],
  },
  {
    help: 'Max speed',
    value: ({max_speed}) => ({
      label: formatSpeed(max_speed),
      isRelevant: 0 < max_speed,
    }),
    total: activities => formatSpeed(getMaxValue(activities, 'max_speed')),
    sortType: 'max_speed',
    excludedTypes: [ActivityType.Tennis, ActivityType.Swim, ActivityType.Hike, ActivityType.Yoga],
  },
  {
    help: 'Average power',
    value: ({average_watts, weighted_average_watts}, _, ftp) => ({
      label: undefined === average_watts ? null : formatPower(average_watts),
      isRelevant: 0 < (average_watts ?? 0),
      tooltip:
        undefined === weighted_average_watts
          ? null
          : `🏋️ ${formatPower(weighted_average_watts)} 〰 Zone ${getPowerZone(average_watts ?? 0, ftp)}`,
    }),
    total: activities => formatPower(getAverageValue(activities, 'average_watts')),
    sortType: 'average_watts',
  },
  {
    help: 'Weighted average power',
    value: ({weighted_average_watts, average_watts}, _, ftp) => ({
      label: undefined === weighted_average_watts ? null : formatPower(weighted_average_watts),
      isRelevant: 0 < (weighted_average_watts ?? 0),
      tooltip:
        undefined === average_watts
          ? null
          : `⚡️ ${formatPower(average_watts)} 〰 Zone ${getPowerZone(weighted_average_watts ?? 0, ftp)}`,
    }),
    total: activities => formatPower(getAverageValue(activities, 'weighted_average_watts')),
    sortType: 'weighted_average_watts',
  },
  {
    help: 'Normalized power',
    value: ({weighted_average_watts}, fullActivity, ftp) => {
      const np = extractNormalizedPower(fullActivity);

      return {
        label: null === np ? null : formatPower(np),
        isRelevant: 0 < (np ?? 0),
        tooltip: undefined === weighted_average_watts ? null : `🏋️ ${formatPower(weighted_average_watts)}`,
        colorPalette: getZoneColor(getPowerZone(np ?? 0, ftp)),
      };
    },
    total: (activities, activityMeta) => {
      const values = activities
        .map(activity => activityMeta[activity.id])
        .map(extractNormalizedPower)
        .filter(value => typeof value === 'number');

      return formatPower(values.reduce((a, b) => a + b, 0) / values.length);
    },
    sortType: 'normalized_power',
  },
  {
    help: 'Max power',
    value: ({max_watts}) => ({
      label: undefined === max_watts ? null : formatPower(max_watts),
      isRelevant: 0 < (max_watts ?? 0),
    }),
    total: activities => formatPower(getMaxValue(activities, 'max_watts')),
    sortType: 'max_watts',
  },
  {
    help: 'Intensity',
    value: ({weighted_average_watts}, _, ftp) => ({
      label: undefined === weighted_average_watts ? null : formatPercent(weighted_average_watts / ftp),
      isRelevant: 0 < (weighted_average_watts ?? 0),
    }),
    total: (activities, _, getFtp) =>
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
    value: activity => ({
      label: undefined === activity.average_heartrate ? null : Math.round(activity.average_heartrate),
      isRelevant: 0 < (activity.average_heartrate ?? 0),
      tooltip: `🫀 Zone ${getHeartZone(activity)}`,
      colorPalette: getZoneColor(getHeartZone(activity)),
    }),
    total: activities => Math.round(getAverageValue(activities, 'average_heartrate')),
    sortType: 'average_heartrate',
  },
  {
    help: 'Max heartrate',
    value: ({max_heartrate}) => ({
      label: undefined === max_heartrate ? null : Math.round(max_heartrate),
      isRelevant: 0 < (max_heartrate ?? 0),
    }),
    total: activities => getMaxValue(activities, 'max_heartrate'),
    sortType: 'max_heartrate',
  },
  {
    help: 'Suffer score',
    value: ({suffer_score}) => ({
      label: undefined === suffer_score ? null : Math.round(suffer_score),
      isRelevant: 0 < (suffer_score ?? 0),
    }),
    total: activities => Math.round(getAverageValue(activities, 'suffer_score')),
    sortType: 'suffer_score',
  },
  {
    help: 'Calories burned',
    value: activity => ({
      label: guessCalories(activity),
      isRelevant: 0 < (activity.kilojoules ?? 0),
    }),
    total: activities => Math.round(getTotalValue(activities, 'kilojoules')),
    sortType: 'kilojoules',
  },
  {
    help: 'Average cadence',
    value: activity => ({
      label: undefined === activity.average_cadence ? null : Math.round(activity.average_cadence),
      isRelevant: 0 < (activity.average_cadence ?? 0),
    }),
    total: activities => Math.round(getAverageValue(activities, 'average_cadence')),
    sortType: 'average_cadence',
  },
  {
    help: 'Average temperature',
    value: activity => ({
      label: undefined === activity.average_temp ? null : `${Math.round(activity.average_temp)} °C`,
      isRelevant: undefined !== activity.average_temp,
    }),
    total: activities => `${Math.round(getAverageValue(activities, 'average_temp'))} °C`,
    sortType: 'average_temp',
  },
  {
    help: 'PR count',
    value: ({pr_count}) => ({
      label: pr_count,
      isRelevant: 0 < pr_count,
    }),
    total: activities => getTotalValue(activities, 'pr_count'),
    sortType: 'pr_count',
  },
  {
    help: 'Achievement count',
    value: ({achievement_count}) => ({
      label: achievement_count,
      isRelevant: 0 < achievement_count,
    }),
    total: activities => getTotalValue(activities, 'achievement_count'),
    sortType: 'achievement_count',
  },
  {
    help: 'Athlete count',
    value: ({athlete_count}) => ({
      label: athlete_count,
      isRelevant: 1 < athlete_count,
    }),
    total: activities => Math.round(getAverageValue(activities, 'athlete_count')),
    sortType: 'athlete_count',
  },
  {
    help: 'Kudos count',
    value: ({kudos_count}) => ({
      label: kudos_count,
      isRelevant: 0 < kudos_count,
    }),
    total: activities => getTotalValue(activities, 'kudos_count'),
    sortType: 'kudos_count',
  },
  {
    help: 'Photo count',
    value: ({total_photo_count}) => ({
      label: total_photo_count,
      isRelevant: 0 < total_photo_count,
    }),
    total: activities => getTotalValue(activities, 'total_photo_count'),
    sortType: 'photo_count',
  },
];

export {TAGS};
