import {ReactNode, useState} from 'react';
import {VStack, Skeleton, HStack, Text} from '@chakra-ui/react';
import {StatHelpText, StatLabel, StatRoot, StatUpTrend, StatValueText, Tooltip} from '../components/ui';
import {useActivities, useAthlete} from '../hooks';
import {
  eddingtonNumber,
  formatCalories,
  formatDistance,
  formatDurationInDays,
  formatSpeed,
  getMaxValue,
  getTotalValue,
  getTypes,
} from '../models';
import {ActivityType, DetailedActivity, DetailedAthlete} from '../models/strava';

const TYPES = ['Ride', 'Run', 'Swim', 'Tennis'];

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
        helpText: 'Rides',
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
        // info: activities =>
        //   `Last year: ${formatDistance(
        //     getTotalValue(
        //       activities.filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear() - 1),
        //       'distance'
        //     )
        //   )}`,
        number: activities =>
          formatDistance(
            getTotalValue(
              activities.filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear()),
              'distance'
            )
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
        // info: formatDuration(getTotalValue(activities, 'moving_time'), true)
        number: activities => formatDurationInDays(getTotalValue(activities, 'moving_time')),
      },
      {
        label: '🍕',
        helpText: 'Calories burned',
        number: activities => formatCalories(getTotalValue(activities, 'kilojoules'), false),
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
        // info: `${athlete.weight} kg`,
        number: (_, athlete) => `${athlete.ftp} 〰 ${(athlete.ftp / athlete.weight).toFixed(1)}`,
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
                  <StatUpTrend marginLeft={5}>{next}</StatUpTrend>
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
        helpText: 'Runs',
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
        // info: formatDuration(getTotalValue(activities, 'moving_time'), true),
        number: activities => formatDurationInDays(getTotalValue(activities, 'moving_time')),
      },
    ],
  ],
  Swim: [
    [
      {
        label: '🩲',
        helpText: 'Sessions',
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
        // info: formatDuration(getTotalValue(activities, 'moving_time'), true)
        number: activities => formatDurationInDays(getTotalValue(activities, 'moving_time')),
      },
    ],
  ],
  Tennis: [
    [
      {
        label: '🎾',
        helpText: 'Sessions',
        number: activities => activities.length,
      },
      {
        label: '⏱️',
        helpText: 'Spent playing',
        // info: formatDuration(getTotalValue(activities, 'moving_time'), true)
        number: activities => formatDurationInDays(getTotalValue(activities, 'moving_time')),
      },
    ],
  ],
};

const Stats = () => {
  const [typeIndex, setTypeIndex] = useState<number>(0);

  const athlete = useAthlete();
  const [activities] = useActivities({
    withPrivate: true,
    includedActivityTypes: getTypes(TYPES[typeIndex] as ActivityType),
  });

  const toggleTypeChange = () => setTypeIndex((typeIndex + 1) % TYPES.length);

  const isLoading = null === athlete || null === activities;

  return (
    <VStack alignItems="stretch" onClick={toggleTypeChange}>
      {STATS[TYPES[typeIndex]].map((statGroup, index) => (
        <HStack key={index}>
          {statGroup.map(stat => (
            <StatRoot key={stat.label}>
              <StatLabel fontSize="1.2em">{stat.label}</StatLabel>
              {isLoading ? (
                <Skeleton width="70%">
                  <StatHelpText>Loading</StatHelpText>
                </Skeleton>
              ) : (
                <StatValueText fontSize="1.3em">{stat.number(activities, athlete)}</StatValueText>
              )}
              <StatHelpText fontSize=".8em">{stat.helpText}</StatHelpText>
            </StatRoot>
          ))}
        </HStack>
      ))}
    </VStack>
  );
};

export {Stats};
