import {
  formatDuration,
  formatDurationInDays,
  getAverageValue,
  getTotalValue,
} from '../../models';
import {StatEntry} from './types';

const TENNIS_STATS: StatEntry[][] = [
  [
    activities => ({
      label: '🎾',
      helpText: 'Sessions',
      value: activities.length.toString(),
    }),
    activities => ({
      label: '⏱️',
      helpText: 'Spent playing',
      info: formatDuration(getTotalValue(activities, 'moving_time'), true),
      value: formatDurationInDays(getTotalValue(activities, 'moving_time')),
    }),
    activities => ({
      label: '⏳',
      helpText: 'Avg duration',
      value: formatDuration(getAverageValue(activities, 'moving_time')),
    }),
    activities => ({
      label: '🫀',
      helpText: 'Avg heart rate',
      value: `${Math.round(getAverageValue(activities, 'average_heartrate'))} bpm`,
    }),
    activities => ({
      label: '🌶️',
      helpText: 'Avg suffer score',
      value: Math.round(getAverageValue(activities, 'suffer_score')),
    }),
  ],
];

export {TENNIS_STATS};
