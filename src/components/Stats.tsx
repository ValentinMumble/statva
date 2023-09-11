import {StatGroup, Stat, StatLabel, StatNumber, StatHelpText} from '@chakra-ui/react';
import {useActivities} from '../hooks';
import {
  DEFAULT_INCLUDED_ACTIVITY_TYPES,
  DetailedActivity,
  formatDistance,
  formatDuration,
  formatSpeed,
  getMaxValue,
  getTotalValue,
} from '../models';

type Stat = {
  label: string;
  helpText: string;
  number: (activities: DetailedActivity[]) => string;
};

const STATS: Stat[] = [
  {
    label: '🚲',
    helpText: 'Total count',
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
    number: activities => formatDuration(getTotalValue(activities, 'moving_time')),
  },
  {
    label: '💯',
    helpText: 'Max average speed',
    number: activities => formatSpeed(getMaxValue(activities, 'average_speed')),
  },
];

type StatsProps = {};

const Stats = ({}: StatsProps) => {
  const activities = useActivities({withCommute: true, withPrivate: true});

  if (null === activities) {
    return null;
  }

  const filteredActivities = activities.filter(activity => DEFAULT_INCLUDED_ACTIVITY_TYPES.includes(activity.type));

  return (
    <StatGroup>
      {STATS.map(stat => (
        <Stat key={stat.label}>
          <StatLabel>{stat.label}</StatLabel>
          <StatNumber>{stat.number(filteredActivities)}</StatNumber>
          <StatHelpText>{stat.helpText}</StatHelpText>
        </Stat>
      ))}
    </StatGroup>
  );
};

export {Stats};
