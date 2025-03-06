import {ReactNode, useState} from 'react';
import {VStack, HStack, Text} from '@chakra-ui/react';
import {ProgressCircleRing, ProgressCircleRoot, StatUpTrend} from '../components/ui';
import {useActivities, useAthlete} from '../hooks';
import {
  eddingtonNumber,
  formatCalories,
  formatDistance,
  formatDuration,
  formatDurationInDays,
  formatPower,
  formatSpeed,
  getAverageValue,
  getMaxValue,
  getMonday,
  getMonthDiff,
  getRidesBetween,
  getTotalValue,
  getTypes,
} from '../models';
import {ActivityType, Activity, Athlete} from '../models/strava';
import {StatComponent} from './StatComponent';

const TYPES: ActivityType[] = [ActivityType.Ride, ActivityType.Run, ActivityType.Swim, ActivityType.Tennis];
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

const GLOBAL_STATS: Stat[] = [
  activities => {
    const monday = getMonday();
    const sunday = new Date();
    sunday.setDate(monday.getDate() + 6);
    const weekActivities = getRidesBetween(activities, monday, sunday);

    return {
      label: '🏓',
      helpText: 'Week activity count',
      value: (
        <span>
          {weekActivities.length}
          <StatUpTrend marginLeft={5} width="24px" />
        </span>
      ),
    };
  },
  activities => {
    const monday = getMonday();
    const sunday = new Date();
    sunday.setDate(monday.getDate() + 6);
    const weekActivities = getRidesBetween(activities, monday, sunday);

    return {
      label: '🌶️',
      helpText: 'Week load',
      value: (
        <span>
          {getTotalValue(weekActivities, 'suffer_score')}
          <StatUpTrend marginLeft={5} width="24px" />
        </span>
      ),
    };
  },
  activities => {
    const monday = getMonday();
    const sunday = new Date();
    sunday.setDate(monday.getDate() + 6);
    const weekActivities = getRidesBetween(activities, monday, sunday);

    return {
      label: '⏱️',
      helpText: 'Week moving time',
      value: (
        <span>
          {formatDuration(getTotalValue(weekActivities, 'moving_time'))}
          <StatUpTrend marginLeft={5} width="24px" />
        </span>
      ),
    };
  },
];

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
        const goalReached = 100 <= yearProgress;

        return {
          label: goalReached ? (
            '✅'
          ) : (
            <ProgressCircleRoot size="xs" colorPalette="orange" value={yearProgress}>
              <ProgressCircleRing cap="round" />
            </ProgressCircleRoot>
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
      activities => ({
        label: '🥾',
        helpText: 'Gran Fondos',
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
              <StatUpTrend marginLeft={5}>{next}</StatUpTrend>
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
      activities => ({
        label: '🏋',
        helpText: 'N-P avg power',
        value: formatPower(
          getAverageValue(
            activities.filter(({name}) => name.includes('N-Peloton')),
            'weighted_average_watts'
          )
        ),
      }),
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
  const currentType = TYPES[typeIndex];

  const athlete = useAthlete();
  const [activities] = useActivities({
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
  });
  const typeActivities = activities?.filter(({sport_type}) => getTypes(currentType).includes(sport_type)) ?? null;

  const toggleTypeChange = () => setTypeIndex((typeIndex + 1) % TYPES.length);

  return (
    <VStack alignItems="stretch">
      <Text textStyle="xl">Week</Text>
      <HStack>
        {GLOBAL_STATS.map((stat, index) => (
          <StatComponent key={index} stat={stat} activities={activities} athlete={athlete} />
        ))}
      </HStack>
      <Text textStyle="xl" marginTop="10px">
        {currentType}
      </Text>
      {STATS[currentType].map((statGroup, index) => (
        <HStack key={index}>
          {statGroup.map((stat, index) => (
            <StatComponent
              key={index}
              stat={stat}
              activities={typeActivities}
              athlete={athlete}
              onClick={toggleTypeChange}
            />
          ))}
        </HStack>
      ))}
    </VStack>
  );
};

export {Stats};
export type {Stat};