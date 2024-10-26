import {ReactNode} from 'react';
import {Text} from '@chakra-ui/react';
import {
  formatDistance,
  getTotalValue,
  formatDurationInDays,
  formatSpeed,
  getMaxValue,
  eddingtonNumber,
  formatDuration,
  formatCalories,
} from '../models';
import {ActivityType, DetailedActivity, DetailedAthlete} from './strava';
import {StatUpTrend, Tooltip} from '../components/ui';

type Stat = {
  label: string;
  helpText: string;
  number: (activities: DetailedActivity[], athlete: DetailedAthlete) => ReactNode;
};

const STATS: {[key: string]: Stat[][]} = {
  Ride: [
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
        number: activities =>
          // <Tooltip
          //   content={`Last year: ${formatDistance(
          //     getTotalValue(
          //       activities.filter(
          //         ({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear() - 1
          //       ),
          //       'distance'
          //     )
          //   )}`}
          // >
          //   {
          formatDistance(
            getTotalValue(
              activities.filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear()),
              'distance'
            )
          ),
          // }
          // </Tooltip>
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
      // {
      //   label: '⏱️',
      //   helpText: 'Spent riding',
      //   number: activities => (
      //     <Tooltip content={formatDuration(getTotalValue(activities, 'moving_time'), true)}>
      //       {formatDurationInDays(getTotalValue(activities, 'moving_time'))}
      //     </Tooltip>
      //   ),
      // },
      {
        label: '🍕',
        helpText: 'Burned',
        number: activities => formatCalories(getTotalValue(activities, 'kilojoules')),
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
          <Tooltip content={`${athlete.weight} kg`}>
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
            <Tooltip content={`${next} ride${1 < next ? 's' : ''} ≥ ${eddington + 1} km for next level`}>
              <span>
                {eddington}
                <Text marginLeft={2} fontSize="14px" as="b">
                  <StatUpTrend marginLeft={5} />
                  {next}
                </Text>
              </span>
            </Tooltip>
          );
        },
      },
    ],
  ],
  Run: [
    [
      {
        label: '👟',
        helpText: 'Run count',
        number: activities => activities.length,
      },
      {
        label: '🗺️',
        helpText: 'Distance run',
        number: activities => formatDistance(getTotalValue(activities, 'distance')),
      },
      {
        label: '⏱️',
        helpText: 'Spent running',
        number: activities => (
          <Tooltip content={formatDuration(getTotalValue(activities, 'moving_time'), true)}>
            {formatDurationInDays(getTotalValue(activities, 'moving_time'))}
          </Tooltip>
        ),
      },
    ],
  ],
  Swim: [
    [
      {
        label: '🩲',
        helpText: 'Swim count',
        number: activities => activities.length,
      },
      {
        label: '🗺️',
        helpText: 'Distance swum',
        number: activities => formatDistance(getTotalValue(activities, 'distance')),
      },
      {
        label: '⏱️',
        helpText: 'Spent swimming',
        number: activities => (
          <Tooltip content={formatDuration(getTotalValue(activities, 'moving_time'), true)}>
            {formatDurationInDays(getTotalValue(activities, 'moving_time'))}
          </Tooltip>
        ),
      },
    ],
  ],
  Tennis: [
    [
      {
        label: '🎾',
        helpText: 'Tennis sessions',
        number: activities => activities.length,
      },
      {
        label: '⏱️',
        helpText: 'Spent playing',
        number: activities => (
          <Tooltip content={formatDuration(getTotalValue(activities, 'moving_time'), true)}>
            {formatDurationInDays(getTotalValue(activities, 'moving_time'))}
          </Tooltip>
        ),
      },
    ],
  ],
};

export {STATS};
