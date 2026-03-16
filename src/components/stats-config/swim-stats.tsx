import {
  formatDistance,
  formatDistanceMeters,
  formatDuration,
  formatDurationInDays,
  getAverageValue,
  getTotalValue,
} from '../../models';
import {StatEntry} from './types';

const SWIM_STATS: StatEntry[][] = [
  [
    activities => ({
      label: '🩲',
      helpText: 'Sessions',
      value: activities.length,
    }),
    activities => ({
      label: '📍',
      helpText: 'Distance swum',
      value: formatDistance(getTotalValue(activities, 'distance')),
    }),
    activities => ({
      label: '🗺️',
      helpText: 'Avg distance',
      value: formatDistanceMeters(getAverageValue(activities, 'distance')),
    }),
    activities => ({
      label: '🌶️',
      helpText: 'Avg suffer score',
      value: Math.round(getAverageValue(activities, 'suffer_score')),
    }),
    activities => ({
      label: '⏱️',
      helpText: 'Spent swimming',
      info: formatDuration(getTotalValue(activities, 'moving_time'), true),
      value: formatDurationInDays(getTotalValue(activities, 'moving_time')),
    }),
  ],
];

export {SWIM_STATS};
