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

export {SORT_TYPES};
export type {SortDirection, SortType};
