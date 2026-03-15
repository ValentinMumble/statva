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

type TagValue = {
  label: string | number | null;
  isRelevant: boolean;
  tooltip?: string | number | null;
  colorPalette?: string;
};

type Tag = {
  sortType: SortType;
  help: string;
  excludedTypes?: ActivityType[];
  value: (activity: Activity, fullActivity: DetailedActivity | null, ftp: number) => TagValue;
  total: (activities: Activity[], activityMeta: Record<string, DetailedActivity>, getFtp: GetFtp) => string | number;
};

type NumericField = keyof {
  [K in keyof Activity as Activity[K] extends number ? K : never]: Activity[K];
};

type OptionalNumericField = keyof {
  [K in keyof Activity as Activity[K] extends number | undefined ? K : never]: Activity[K];
};

/** Tag that displays a raw numeric field (always present), with getTotalValue as total. */
const simpleTag = (
  help: string,
  sortType: SortType,
  field: NumericField,
  opts: {threshold?: number; totalAgg?: 'sum' | 'avg'} = {}
): Tag => {
  const {threshold = 0, totalAgg = 'sum'} = opts;
  return {
    help,
    sortType,
    value: activity => ({
      label: activity[field] as number,
      isRelevant: threshold < (activity[field] as number),
    }),
    total:
      totalAgg === 'avg'
        ? activities => Math.round(getAverageValue(activities, field))
        : activities => getTotalValue(activities, field),
  };
};

/** Tag that displays an optional numeric field (may be undefined), rounded. */
const optionalRoundedTag = (
  help: string,
  sortType: SortType,
  field: OptionalNumericField,
  totalAgg: 'sum' | 'avg' | 'max',
  extra?: {
    tooltip?: (activity: Activity) => string | number | null;
    colorPalette?: (activity: Activity) => string | undefined;
  }
): Tag => {
  const totalFns = {
    sum: (activities: Activity[]) => Math.round(getTotalValue(activities, field)),
    avg: (activities: Activity[]) => Math.round(getAverageValue(activities, field)),
    max: (activities: Activity[]) => getMaxValue(activities, field),
  };

  return {
    help,
    sortType,
    value: activity => {
      const val = activity[field] as number | undefined;
      return {
        label: undefined === val ? null : Math.round(val),
        isRelevant: 0 < (val ?? 0),
        tooltip: extra?.tooltip?.(activity),
        colorPalette: extra?.colorPalette?.(activity),
      };
    },
    total: totalFns[totalAgg],
  };
};

const TAGS: Tag[] = [
  {
    help: 'Distance',
    sortType: 'distance',
    excludedTypes: [ActivityType.Yoga],
    value: ({distance, sport_type}) => ({
      label: ActivityType.Swim === sport_type ? formatDistanceMeters(distance) : formatDistance(distance),
      isRelevant: 0 < distance,
      tooltip: `📍 ${formatDistance(distance, 2)}`,
    }),
    total: activities => formatDistance(getTotalValue(activities, 'distance')),
  },
  {
    help: 'D+',
    sortType: 'total_elevation_gain',
    excludedTypes: [ActivityType.Tennis, ActivityType.Yoga],
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
  },
  {
    help: 'D+ percentage',
    sortType: 'elevation_percent',
    excludedTypes: [ActivityType.Swim, ActivityType.Tennis, ActivityType.Yoga],
    value: ({total_elevation_gain, distance}) => ({
      label: formatPercent(total_elevation_gain / distance, 2),
      isRelevant: 0 < total_elevation_gain / distance,
    }),
    total: activities =>
      formatPercent(getTotalValue(activities, 'total_elevation_gain') / getTotalValue(activities, 'distance'), 2),
  },
  {
    help: 'Moving time',
    sortType: 'moving_time',
    value: ({moving_time, elapsed_time}) => ({
      label: formatDuration(moving_time),
      isRelevant: 0 < moving_time,
      tooltip: `⏳ ${formatDuration(elapsed_time)}`,
    }),
    total: activities => formatDurationInDays(getTotalValue(activities, 'moving_time')),
  },
  {
    help: 'Elapsed time',
    sortType: 'elapsed_time',
    value: ({elapsed_time}) => ({
      label: formatDuration(elapsed_time),
      isRelevant: 0 < elapsed_time,
    }),
    total: activities => formatDurationInDays(getTotalValue(activities, 'elapsed_time')),
  },
  {
    help: 'Average speed',
    sortType: 'average_speed',
    excludedTypes: [ActivityType.Tennis],
    value: activity => ({
      label: formatPaceOrSpeed(activity),
      isRelevant: 0 < activity.average_speed,
      tooltip: `🏁 ${formatPaceOrSpeed(activity, 3, true)}`,
    }),
    total: activities => formatSpeed(getAverageValue(activities, 'average_speed')),
  },
  {
    help: 'Max speed',
    sortType: 'max_speed',
    excludedTypes: [ActivityType.Tennis, ActivityType.Swim, ActivityType.Hike, ActivityType.Yoga],
    value: ({max_speed}) => ({
      label: formatSpeed(max_speed),
      isRelevant: 0 < max_speed,
    }),
    total: activities => formatSpeed(getMaxValue(activities, 'max_speed')),
  },
  {
    help: 'Average power',
    sortType: 'average_watts',
    value: ({average_watts, weighted_average_watts}, _, ftp) => ({
      label: undefined === average_watts ? null : formatPower(average_watts),
      isRelevant: 0 < (average_watts ?? 0),
      tooltip:
        undefined === weighted_average_watts
          ? null
          : `🏋️ ${formatPower(weighted_average_watts)} 〰 Zone ${getPowerZone(average_watts ?? 0, ftp)}`,
    }),
    total: activities => formatPower(getAverageValue(activities, 'average_watts')),
  },
  {
    help: 'Weighted average power',
    sortType: 'weighted_average_watts',
    value: ({weighted_average_watts, average_watts}, _, ftp) => ({
      label: undefined === weighted_average_watts ? null : formatPower(weighted_average_watts),
      isRelevant: 0 < (weighted_average_watts ?? 0),
      tooltip:
        undefined === average_watts
          ? null
          : `⚡️ ${formatPower(average_watts)} 〰 Zone ${getPowerZone(weighted_average_watts ?? 0, ftp)}`,
    }),
    total: activities => formatPower(getAverageValue(activities, 'weighted_average_watts')),
  },
  {
    help: 'Normalized power',
    sortType: 'normalized_power',
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
  },
  {
    help: 'Max power',
    sortType: 'max_watts',
    value: ({max_watts}) => ({
      label: undefined === max_watts ? null : formatPower(max_watts),
      isRelevant: 0 < (max_watts ?? 0),
    }),
    total: activities => formatPower(getMaxValue(activities, 'max_watts')),
  },
  {
    help: 'Intensity',
    sortType: 'intensity',
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
  },
  {
    ...optionalRoundedTag('Average heartrate', 'average_heartrate', 'average_heartrate', 'avg', {
      tooltip: activity => `🫀 Zone ${getHeartZone(activity)}`,
      colorPalette: activity => getZoneColor(getHeartZone(activity)),
    }),
  },
  optionalRoundedTag('Max heartrate', 'max_heartrate', 'max_heartrate', 'max'),
  optionalRoundedTag('Suffer score', 'suffer_score', 'suffer_score', 'avg'),
  {
    help: 'Calories burned',
    sortType: 'kilojoules',
    value: activity => ({
      label: guessCalories(activity),
      isRelevant: 0 < (activity.kilojoules ?? 0),
    }),
    total: activities => Math.round(getTotalValue(activities, 'kilojoules')),
  },
  optionalRoundedTag('Average cadence', 'average_cadence', 'average_cadence', 'avg'),
  {
    help: 'Average temperature',
    sortType: 'average_temp',
    value: activity => ({
      label: undefined === activity.average_temp ? null : `${Math.round(activity.average_temp)} °C`,
      isRelevant: undefined !== activity.average_temp,
    }),
    total: activities => `${Math.round(getAverageValue(activities, 'average_temp'))} °C`,
  },
  simpleTag('PR count', 'pr_count', 'pr_count'),
  simpleTag('Achievement count', 'achievement_count', 'achievement_count'),
  simpleTag('Athlete count', 'athlete_count', 'athlete_count', {threshold: 1, totalAgg: 'avg'}),
  simpleTag('Kudos count', 'kudos_count', 'kudos_count'),
  simpleTag('Photo count', 'photo_count', 'total_photo_count'),
];

export {TAGS};
