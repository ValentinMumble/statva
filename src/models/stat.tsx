import {ReactNode} from 'react';
import {StatArrow, Text} from '@chakra-ui/react';
import {
  formatDistance,
  getTotalValue,
  formatDurationInDays,
  formatSpeed,
  getMaxValue,
  eddingtonNumber,
} from '../models';
import {DetailedActivity, DetailedAthlete} from './strava';

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
      helpText: 'Total distance',
      number: activities => formatDistance(getTotalValue(activities, 'distance'), 0),
    },
    {
      label: '🎊',
      helpText: 'This year',
      number: activities =>
        formatDistance(
          getTotalValue(
            activities.filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear()),
            'distance'
          ),
          0
        ),
    },
    {
      label: '⛰️',
      helpText: 'Total D+',
      number: activities => formatDistance(getTotalValue(activities, 'total_elevation_gain'), 1),
    },
  ],
  [
    {
      label: '⏱️',
      helpText: 'Total moving time',
      number: activities => formatDurationInDays(getTotalValue(activities, 'moving_time')),
    },
    {
      label: '🏁',
      helpText: 'Max avg speed',
      number: activities => formatSpeed(getMaxValue(activities, 'average_speed')),
    },
    {
      label: '⚡️',
      helpText: 'FTP - W | W/kg',
      number: (_, athlete) => `${athlete.ftp} | ${(athlete.ftp / athlete.weight).toFixed(1)}`,
    },
    {
      label: '🧸',
      helpText: 'Eddington №',
      number: activities => {
        const [eddington, next] = eddingtonNumber(activities);

        return (
          <>
            {eddington}
            <Text marginLeft={2} fontSize="14px" as="b">
              <StatArrow type="increase" marginLeft={4} /> {next}
            </Text>
          </>
        );
      },
    },
  ],
];

export {STATS};
