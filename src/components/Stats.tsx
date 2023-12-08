import {ReactNode} from 'react';
import {StatGroup, Stat, StatLabel, StatNumber, StatHelpText, Text, VStack} from '@chakra-ui/react';
import {useActivities} from '../hooks';
import {
  DetailedActivity,
  FTP,
  WEIGHT,
  eddingtonNumber,
  formatDistance,
  formatDurationInDays,
  formatSpeed,
  getMaxValue,
  getTotalValue,
} from '../models';

type Stat = {
  label: string;
  helpText: string;
  number: (activities: DetailedActivity[]) => ReactNode;
};

const STATS: Stat[][] = [
  [
    {
      label: '🚲',
      helpText: 'Ride count',
      number: activities => activities.length.toString(),
    },
    {
      label: '🗺️',
      helpText: 'Total distance',
      number: activities => formatDistance(getTotalValue(activities, 'distance'), 0),
    },
    {
      label: '⛰️',
      helpText: 'Total D+',
      number: activities => formatDistance(getTotalValue(activities, 'total_elevation_gain'), 1),
    },
    {
      label: '⏱️',
      helpText: 'Total moving time',
      number: activities => formatDurationInDays(getTotalValue(activities, 'moving_time')),
    },
  ],
  [
    {
      label: '🏁',
      helpText: 'Max avg speed',
      number: activities => formatSpeed(getMaxValue(activities, 'average_speed')),
    },
    {
      label: '⚡️',
      helpText: 'FTP - W | W/kg',
      number: () => `${FTP} | ${(FTP / WEIGHT).toFixed(1)}`,
    },
    {
      label: '🧸',
      helpText: 'Eddington number',
      number: activities => {
        const [eddington, next] = eddingtonNumber(activities);

        return (
          <>
            {eddington}
            <Text marginLeft={5} fontSize="14px" as="b">
              (next in {next})
            </Text>
          </>
        );
      },
    },
  ],
];

const Stats = () => {
  const activities = useActivities({withCommute: true, withPrivate: true});

  if (null === activities) {
    return null;
  }

  return (
    <VStack alignItems="stretch">
      {STATS.map((statGroup, index) => (
        <StatGroup key={index}>
          {statGroup.map(stat => (
            <Stat key={stat.label}>
              <StatLabel>{stat.label}</StatLabel>
              <StatNumber>{stat.number(activities)}</StatNumber>
              <StatHelpText>{stat.helpText}</StatHelpText>
            </Stat>
          ))}
        </StatGroup>
      ))}
    </VStack>
  );
};

export {Stats};
