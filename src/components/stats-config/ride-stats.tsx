import {ProgressCircle} from '@chakra-ui/react';
import {
  eddingtonNumber,
  extractNormalizedPower,
  formatDistance,
  formatDuration,
  formatDurationInDays,
  formatPower,
  formatSpeed,
  getAverageValue,
  getMaxValue,
  getMonthDiff,
  getTotalValue,
} from '../../models';
import {ActivityType} from '../../models/strava';
import {StatEntry, StatTrend} from './types';

const YEAR_GOAL_KM = 10000;

const RIDE_STATS: StatEntry[][] = [
  [
    activities => ({
      label: '🚲',
      helpText: 'Rides',
      value: activities.length,
    }),
    activities => ({
      label: '📍',
      helpText: 'Distance ridden',
      value: formatDistance(getTotalValue(activities, 'distance')),
    }),
    activities => {
      const yearTotal = getTotalValue(
        activities.filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear()),
        'distance'
      );
      const yearProgress = Math.min(100, (yearTotal / 1000 / YEAR_GOAL_KM) * 100);
      const goalReached = 100 <= yearProgress;

      return {
        label: goalReached ? (
          '✅'
        ) : (
          <ProgressCircle.Root size="xs" colorPalette="orange" value={yearProgress}>
            <ProgressCircle.Circle>
              <ProgressCircle.Track />
              <ProgressCircle.Range strokeLinecap="round" />
            </ProgressCircle.Circle>
          </ProgressCircle.Root>
        ),
        helpText: 'This year',
        info: `Last year: ${formatDistance(
          getTotalValue(
            activities.filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear() - 1),
            'distance'
          )
        )}`,
        value: formatDistance(yearTotal),
      };
    },
    activities => ({
      label: '⛰️',
      helpText: 'Total D+',
      value: formatDistance(getTotalValue(activities, 'total_elevation_gain')),
      info: `This year: ${formatDistance(
        getTotalValue(
          activities.filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear()),
          'total_elevation_gain'
        )
      )}`,
    }),
    activities => ({
      label: '🚎',
      helpText: 'Commuting',
      value: formatDistance(
        getTotalValue(
          activities.filter(({commute}) => commute),
          'distance'
        )
      ),
      info: `This year: ${formatDistance(
        getTotalValue(
          activities.filter(
            ({start_date, commute}) => commute && new Date(start_date).getFullYear() === new Date().getFullYear()
          ),
          'distance'
        )
      )}`,
    }),
  ],
  [
    activities => ({
      label: '⏱️',
      helpText: 'Spent riding',
      info: formatDuration(getTotalValue(activities, 'moving_time'), true),
      value: formatDurationInDays(getTotalValue(activities, 'moving_time')),
    }),
    activities => ({
      label: '🗺️',
      helpText: 'Avg distance',
      value: formatDistance(
        getAverageValue(
          activities.filter(({commute}) => !commute),
          'distance'
        ),
        1
      ),
    }),
    activities => ({
      label: '🏁',
      helpText: 'Max avg speed',
      value: formatSpeed(
        getMaxValue(
          activities.filter(({type}) => ![ActivityType.VirtualRide].includes(type)),
          'average_speed'
        )
      ),
    }),
    (_, __, athlete) => ({
      label: '⚡️',
      helpText: 'FTP: W 〰 W/kg',
      info: `${athlete.weight} kg`,
      value: `${athlete.ftp} 〰 ${(athlete.ftp / athlete.weight).toFixed(1)}`,
    }),
    activities => ({
      label: '🥾',
      helpText: 'Gran Fondos',
      info: `${activities.filter(({distance}) => distance >= 200 * 1000).length} × 200 km`,
      value: activities.filter(({distance}) => distance >= 100 * 1000).length,
    }),
  ],
  [
    activities => {
      const [eddington, next] = eddingtonNumber(activities);

      return {
        label: '🧸',
        helpText: 'Eddington №',
        info: `${next} ride${1 < next ? 's' : ''} ≥ ${eddington + 1} km for next level`,
        value: (
          <span>
            {eddington}
            <StatTrend marginLeft={5} up={true}>
              {next}
            </StatTrend>
          </span>
        ),
      };
    },
    activities => {
      const npRides = activities.filter(({name}) => name.includes('N-Peloton'));
      const monthDiff = getMonthDiff(
        new Date(npRides.at(0)?.start_date ?? 0),
        new Date(npRides.at(-1)?.start_date ?? 0)
      );

      return {
        label: '🦊',
        helpText: 'N-P count',
        value: npRides.length,
        info: `${(npRides.length / monthDiff).toFixed(1)} / month`,
      };
    },
    activities => ({
      label: '📍',
      helpText: 'N-P distance',
      value: formatDistance(
        getTotalValue(
          activities.filter(({name}) => name.includes('N-Peloton')),
          'distance'
        )
      ),
    }),
    activities => ({
      label: '🏁',
      helpText: 'N-P avg speed',
      value: formatSpeed(
        getAverageValue(
          activities.filter(({name}) => name.includes('N-Peloton')),
          'average_speed'
        )
      ),
    }),
    (_, activityMeta) => {
      const values = Object.values(activityMeta)
        .filter(({name}) => name.includes('N-Peloton'))
        .map(extractNormalizedPower)
        .filter(value => typeof value === 'number');

      return {
        label: '⚡️®',
        helpText: 'N-P avg NP',
        value: formatPower(values.reduce((a, b) => a + b, 0) / values.length),
      };
    },
  ],
];

export {RIDE_STATS};
