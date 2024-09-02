import {ReactNode} from 'react';
import {StatArrow, Text, Tooltip} from '@chakra-ui/react';
import {
  formatDistance,
  getTotalValue,
  formatDurationInDays,
  formatSpeed,
  getMaxValue,
  eddingtonNumber,
  formatDuration,
  KJ_TO_CAL_RATIO,
} from '../models';
import {ActivityType, DetailedActivity, DetailedAthlete} from './strava';

type Stat = {
  label: string;
  helpText: string;
  number: (activities: DetailedActivity[], athlete: DetailedAthlete) => ReactNode;
};

const STATS: Stat[][] = [
  [
    {
      label: '🚲',
      helpText: 'Ride count',
      number: activities => activities.length,
    },
    {
      label: '🗺️',
      helpText: 'Distance ridden',
      number: activities => formatDistance(getTotalValue(activities, 'distance')),
    },
    {
      label: '🎊',
      helpText: 'This year',
      number: activities => (
        <Tooltip
          label={`Last year: ${formatDistance(
            getTotalValue(
              activities.filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear() - 1),
              'distance'
            )
          )}`}
        >
          {formatDistance(
            getTotalValue(
              activities.filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear()),
              'distance'
            )
          )}
        </Tooltip>
      ),
    },
    {
      label: '⛰️',
      helpText: 'Total D+',
      number: activities => formatDistance(getTotalValue(activities, 'total_elevation_gain')),
    },
    {
      label: '🥾',
      helpText: 'Gran Fondos',
      number: activities => activities.filter(({distance}) => distance >= 100 * 1000).length,
    },
  ],
  [
    {
      label: '⏱️',
      helpText: 'Spent riding',
      number: activities => (
        <Tooltip label={formatDuration(getTotalValue(activities, 'moving_time'), true)}>
          {formatDurationInDays(getTotalValue(activities, 'moving_time'))}
        </Tooltip>
      ),
    },
    {
      label: '🍕',
      helpText: 'Calories burned',
      number: activities => Math.round(getTotalValue(activities, 'kilojoules') * KJ_TO_CAL_RATIO),
    },
    {
      label: '🏁',
      helpText: 'Max avg speed',
      number: activities =>
        formatSpeed(
          getMaxValue(
            activities.filter(({type}) => ![ActivityType.VirtualRide].includes(type)),
            'average_speed'
          )
        ),
    },
    {
      label: '⚡️',
      helpText: 'FTP: W 〰 W/kg',
      number: (_, athlete) => (
        <Tooltip label={`${athlete.weight} kg`}>
          <span>
            {athlete.ftp} 〰 {(athlete.ftp / athlete.weight).toFixed(1)}
          </span>
        </Tooltip>
      ),
    },
    {
      label: '🧸',
      helpText: 'Eddington №',
      number: activities => {
        const [eddington, next] = eddingtonNumber(activities);

        return (
          <Tooltip label={`${next} ride${1 < next ? 's' : ''} ≥ ${eddington + 1} km for next level`}>
            <span>
              {eddington}
              <Text marginLeft={2} fontSize="14px" as="b">
                <StatArrow type="increase" marginLeft={5} />
                {next}
              </Text>
            </span>
          </Tooltip>
        );
      },
    },
  ],
];

export {STATS};
