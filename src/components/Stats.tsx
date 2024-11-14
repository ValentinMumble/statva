import {ReactNode, useState} from 'react';
import {VStack, HStack} from '@chakra-ui/react';
import {
  ProgressBar,
  ProgressRoot,
  Skeleton,
  SkeletonText,
  StatHelpText,
  StatLabel,
  StatRoot,
  StatUpTrend,
  StatValueText,
  Tooltip,
} from '../components/ui';
import {useActivities, useAthlete} from '../hooks';
import {
  eddingtonNumber,
  formatCalories,
  formatDistance,
  formatDuration,
  formatDurationInDays,
  formatSpeed,
  getMaxValue,
  getTotalValue,
  getTypes,
} from '../models';
import {ActivityType, Activity, Athlete} from '../models/strava';

const TYPES = ['Ride', 'Run', 'Swim', 'Tennis'];
const YEAR_GOAL_KM = 10000;

type Stat = (
  activities: Activity[],
  athlete: Athlete
) => {
  label: ReactNode;
  helpText: ReactNode;
  value: ReactNode;
  info?: ReactNode;
};

const STATS: {[key: string]: Stat[][]} = {
  Ride: [
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

        return {
          label: '🎊',
          helpText: (
            <ProgressRoot
              colorPalette={100 <= yearProgress ? 'green' : 'orange'}
              value={yearProgress}
              marginRight="15px"
            >
              <ProgressBar />
            </ProgressRoot>
          ),
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
        label: '🥾',
        helpText: 'Gran Fondos',
        value: activities.filter(({distance}) => distance >= 100 * 1000).length,
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
        label: '🍕',
        helpText: 'Calories burned',
        value: formatCalories(getTotalValue(activities, 'kilojoules'), false),
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
      (_, athlete) => ({
        label: '⚡️',
        helpText: 'FTP: W 〰 W/kg',
        info: `${athlete.weight} kg`,
        value: `${athlete.ftp} 〰 ${(athlete.ftp / athlete.weight).toFixed(1)}`,
      }),
      activities => {
        const [eddington, next] = eddingtonNumber(activities);

        return {
          label: '🧸',
          helpText: 'Eddington №',
          info: `${next} ride${1 < next ? 's' : ''} ≥ ${eddington + 1} km for next level`,
          value: (
            <span>
              {eddington}
              <StatUpTrend marginLeft={5}>{next}</StatUpTrend>
            </span>
          ),
        };
      },
    ],
  ],
  Run: [
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
        label: '⏱️',
        helpText: 'Spent running',
        info: formatDuration(getTotalValue(activities, 'moving_time'), true),
        value: formatDurationInDays(getTotalValue(activities, 'moving_time')),
      }),
    ],
  ],
  Swim: [
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
        label: '⏱️',
        helpText: 'Spent swimming',
        info: formatDuration(getTotalValue(activities, 'moving_time'), true),
        value: formatDurationInDays(getTotalValue(activities, 'moving_time')),
      }),
    ],
  ],
  Tennis: [
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
    ],
  ],
};

const Stats = () => {
  const [typeIndex, setTypeIndex] = useState<number>(0);

  const athlete = useAthlete();
  const [activities] = useActivities({
    withPrivate: true,
    includedActivityTypes: getTypes(TYPES[typeIndex]),
  });

  const toggleTypeChange = () => setTypeIndex((typeIndex + 1) % TYPES.length);

  const isLoading = null === athlete || null === activities;

  return (
    <VStack alignItems="stretch">
      {STATS[TYPES[typeIndex]].map((statGroup, index) => (
        <HStack key={index}>
          {statGroup.map((stat, index) => {
            if (isLoading) {
              return (
                <StatRoot key={index}>
                  <Skeleton width="40%">l</Skeleton>
                  <Skeleton width="80%">l</Skeleton>
                  <SkeletonText width="70%" noOfLines={1} />
                </StatRoot>
              );
            }

            const {label, value, helpText, info} = stat(activities, athlete);
            const statContent = (
              <StatRoot key={index} onClick={toggleTypeChange}>
                <StatLabel fontSize="1.2em">{label}</StatLabel>
                <StatValueText fontSize="1.3em">{value}</StatValueText>
                <StatHelpText fontSize=".8em">{helpText}</StatHelpText>
              </StatRoot>
            );

            return info ? (
              <Tooltip key={index} content={info}>
                {statContent}
              </Tooltip>
            ) : (
              statContent
            );
          })}
        </HStack>
      ))}
    </VStack>
  );
};

export {Stats};
