import {DetailedActivity} from './strava';

type SortType = keyof typeof SORT_TYPES;

type SortDirection = 'asc' | 'desc';

const SORT_TYPES = {
  date: {
    value: 'date',
    label: '📅',
  },
  name: {
    value: 'name',
    label: '🔤',
    disabled: true,
  },
  distance: {
    value: 'distance',
    label: '🗺️',
  },
  elevation: {
    value: 'elevation',
    label: '⛰️',
  },
  duration: {
    value: 'duration',
    label: '⏱️',
  },
  average_speed: {
    value: 'average_speed',
    label: '🏁',
  },
  max_speed: {
    value: 'max_speed',
    label: '🚀',
  },
  average_watts: {
    value: 'average_watts',
    label: '⚡️',
  },
  suffer_score: {
    value: 'suffer_score',
    label: '🌶️',
  },
  kilojoules: {
    value: 'kilojoules',
    label: '🍕',
  },
  average_cadence: {
    value: 'average_cadence',
    label: '🎡',
  },
  average_heartrate: {
    value: 'average_heartrate',
    label: '🫀',
  },
  kudos_count: {
    value: 'kudos_count',
    label: '👍',
  },
};

const sortActivities = (sortType: SortType, sortDirection: SortDirection, a: DetailedActivity, b: DetailedActivity) => {
  const [first, second] = 'desc' === sortDirection ? [a, b] : [b, a];

  switch (sortType) {
    case 'name':
      return first.name < second.name ? 1 : -1;
    case 'elevation':
      return second.total_elevation_gain - first.total_elevation_gain;
    case 'distance':
      return second.distance - first.distance;
    case 'date':
      return first.start_date < second.start_date ? 1 : -1;
    case 'duration':
      return second.moving_time - first.moving_time;
    case 'average_speed':
      return second.average_speed - first.average_speed;
    case 'max_speed':
      return second.max_speed - first.max_speed;
    case 'average_watts':
      return (second.average_watts ?? 0) - (first.average_watts ?? 0);
    case 'average_cadence':
      return (second.average_cadence ?? 0) - (first.average_cadence ?? 0);
    case 'average_heartrate':
      return (second.average_heartrate ?? 0) - (first.average_heartrate ?? 0);
    case 'kudos_count':
      return second.kudos_count - first.kudos_count;
    case 'suffer_score':
      return (second.suffer_score ?? 0) - (first.suffer_score ?? 0);
    case 'kilojoules':
      return second.kilojoules - first.kilojoules;
  }
};

export {SORT_TYPES, sortActivities};
export type {SortDirection, SortType};
