import {
  formatDistance,
  formatDuration,
  formatDurationInDays,
  getAverageValue,
  getTotalValue,
} from '../../models';
import {StatEntry} from './types';

const RUN_STATS: StatEntry[][] = [
  [
    activities => ({
      label: '👟',
      helpText: 'Runs',
      value: activities.length,
    }),
    activities => ({
      label: '📍',
      helpText: 'Distance run',
      value: formatDistance(getTotalValue(activities, 'distance')),
    }),
    activities => ({
      label: '🗺️',
      helpText: 'Avg distance',
      value: formatDistance(getAverageValue(activities, 'distance'), 1),
    }),
    activities => ({
      label: '🌶️',
      helpText: 'Avg suffer score',
      value: Math.round(getAverageValue(activities, 'suffer_score')),
    }),
    activities => ({
      label: '⏱️',
      helpText: 'Spent running',
      info: formatDuration(getTotalValue(activities, 'moving_time'), true),
      value: formatDurationInDays(getTotalValue(activities, 'moving_time')),
    }),
  ],
];

export {RUN_STATS};
