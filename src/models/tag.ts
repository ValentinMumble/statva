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
  intensityOf,
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

type TotalAgg = 'sum' | 'avg' | 'max';

/** Resolve a total-aggregation function for a given field and formatter. */
const totalFn = <F extends NumericField | OptionalNumericField>(
  field: F,
  agg: TotalAgg,
  format: (v: number) => string | number = v => v,
): Tag['total'] => {
  const aggFns = {sum: getTotalValue, avg: getAverageValue, max: getMaxValue};
  return activities => format(aggFns[agg](activities, field));
};

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Tag that displays a raw numeric field (always present), with getTotalValue as total. */
const simpleTag = (
  help: string,
  sortType: SortType,
  field: NumericField,
  opts: {threshold?: number; totalAgg?: 'sum' | 'avg'} = {},
): Tag => {
  const {threshold = 0, totalAgg = 'sum'} = opts;
  return {
    help,
    sortType,
    value: activity => ({
      label: activity[field] as number,
      isRelevant: threshold < (activity[field] as number),
    }),
    total: totalAgg === 'avg' ? totalFn(field, 'avg', Math.round) : totalFn(field, 'sum'),
  };
};

/** Tag that displays an optional numeric field (may be undefined), rounded. */
const optionalRoundedTag = (
  help: string,
  sortType: SortType,
  field: OptionalNumericField,
  agg: TotalAgg,
  extra?: {
    tooltip?: (activity: Activity) => string | number | null;
    colorPalette?: (activity: Activity) => string | undefined;
  },
): Tag => ({
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
  total: totalFn(field, agg, Math.round),
});

/** Tag for an optional field displayed with a custom formatter (formatPower, formatSpeed, etc.). */
const optionalFormattedTag = (
  help: string,
  sortType: SortType,
  field: OptionalNumericField,
  format: (v: number) => string,
  agg: TotalAgg,
  opts?: {excludedTypes?: ActivityType[]},
): Tag => ({
  help,
  sortType,
  excludedTypes: opts?.excludedTypes,
  value: activity => {
    const val = activity[field] as number | undefined;
    return {
      label: undefined === val ? null : format(val),
      isRelevant: 0 < (val ?? 0),
    };
  },
  total: totalFn(field, agg, format),
});

/** Tag for a duration field (always present), formatted with formatDuration / formatDurationInDays. */
const durationTag = (help: string, sortType: SortType, field: NumericField, tooltipField?: NumericField): Tag => ({
  help,
  sortType,
  value: activity => ({
    label: formatDuration(activity[field] as number),
    isRelevant: 0 < (activity[field] as number),
    tooltip: tooltipField ? `⏳ ${formatDuration(activity[tooltipField] as number)}` : undefined,
  }),
  total: totalFn(field, 'sum', formatDurationInDays),
});

// ---------------------------------------------------------------------------
// Tag definitions
// ---------------------------------------------------------------------------

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
  durationTag('Moving time', 'moving_time', 'moving_time', 'elapsed_time'),
  durationTag('Elapsed time', 'elapsed_time', 'elapsed_time'),
  {
    help: 'Average speed',
    sortType: 'average_speed',
    excludedTypes: [ActivityType.Tennis],
    value: activity => ({
      label: formatPaceOrSpeed(activity),
      isRelevant: 0 < activity.average_speed,
      tooltip: `🏁 ${formatPaceOrSpeed(activity, 3, true)}`,
    }),
    total: totalFn('average_speed', 'avg', formatSpeed),
  },
  optionalFormattedTag('Max speed', 'max_speed', 'max_speed', formatSpeed, 'max', {
    excludedTypes: [ActivityType.Tennis, ActivityType.Swim, ActivityType.Hike, ActivityType.Yoga],
  }),
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
    total: totalFn('average_watts', 'avg', formatPower),
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
    total: totalFn('weighted_average_watts', 'avg', formatPower),
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
      // No activity in the list has normalized power in its notes: nothing to average.
      return 0 === values.length ? '' : formatPower(values.reduce((a, b) => a + b, 0) / values.length);
    },
  },
  optionalFormattedTag('Max power', 'max_watts', 'max_watts', formatPower, 'max'),
  {
    help: 'Intensity',
    sortType: 'intensity',
    value: (activity, fullActivity, ftp) => {
      const intensity = intensityOf(activity, fullActivity, ftp);
      return {label: null === intensity ? null : formatPercent(intensity), isRelevant: 0 < (intensity ?? 0)};
    },
    total: (activities, activityMeta, getFtp) => {
      const intensities = activities
        .map(activity =>
          intensityOf(activity, activityMeta[activity.id] ?? null, getFtp(new Date(activity.start_date))),
        )
        .filter((intensity): intensity is number => null !== intensity);
      return 0 === intensities.length
        ? ''
        : formatPercent(intensities.reduce((total, intensity) => total + intensity, 0) / intensities.length);
    },
  },
  optionalRoundedTag('Average heartrate', 'average_heartrate', 'average_heartrate', 'avg', {
    tooltip: activity => `🫀 Zone ${getHeartZone(activity)}`,
    colorPalette: activity => getZoneColor(getHeartZone(activity)),
  }),
  optionalRoundedTag('Max heartrate', 'max_heartrate', 'max_heartrate', 'max'),
  optionalRoundedTag('Suffer score', 'suffer_score', 'suffer_score', 'avg'),
  {
    help: 'Calories burned',
    sortType: 'kilojoules',
    value: activity => ({
      label: guessCalories(activity),
      isRelevant: 0 < (activity.kilojoules ?? 0),
    }),
    total: totalFn('kilojoules', 'sum', Math.round),
  },
  optionalRoundedTag('Average cadence', 'average_cadence', 'average_cadence', 'avg'),
  optionalFormattedTag('Average temperature', 'average_temp', 'average_temp', v => `${Math.round(v)} °C`, 'avg'),
  simpleTag('PR count', 'pr_count', 'pr_count'),
  simpleTag('Achievement count', 'achievement_count', 'achievement_count'),
  simpleTag('Athlete count', 'athlete_count', 'athlete_count', {threshold: 1, totalAgg: 'avg'}),
  simpleTag('Kudos count', 'kudos_count', 'kudos_count'),
  simpleTag('Photo count', 'photo_count', 'total_photo_count'),
];

export {TAGS};
