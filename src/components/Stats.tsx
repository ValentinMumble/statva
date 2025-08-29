import {ReactNode, useState} from 'react';
import {VStack, HStack, Text, BadgeProps, Badge, Stat, ProgressCircle} from '@chakra-ui/react';
import {useActivities, useActivityMeta, useAthlete} from '../hooks';
import {
  eddingtonNumber,
  extractNormalizedPower,
  formatDistance,
  formatDistanceMeters,
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
import {ActivityType, Activity, Athlete, DetailedActivity} from '../models/strava';
import {StatComponent} from './StatComponent';
import {WeekChart} from './WeekChart';

const StatTrend = (props: BadgeProps & {up: boolean}) => {
  return (
    <Badge colorPalette={props.up ? 'green' : 'red'} gap="0" {...props}>
      {props.up ? <Stat.UpIndicator /> : <Stat.DownIndicator />}
      {props.children}
    </Badge>
  );
};

const TYPES: ActivityType[] = [ActivityType.Ride, ActivityType.Run, ActivityType.Swim, ActivityType.Tennis];
const YEAR_GOAL_KM = 10000;

type StatEntry = (
  activities: Activity[],
  activityMeta: Record<string, DetailedActivity>,
  athlete: Athlete
) => {
  label: ReactNode;
  helpText: ReactNode;
  value: ReactNode;
  info?: ReactNode;
};

const getWeeksActivities = (activities: Activity[]) => {
  const monday = getMonday();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const lastMonday = new Date(monday);
  lastMonday.setDate(monday.getDate() - 7);
  const lastWeeksTomorrow = new Date(tomorrow);
  lastWeeksTomorrow.setDate(tomorrow.getDate() - 7);

  const weekActivities = getRidesBetween(activities, monday, tomorrow);
  const lastWeekActivities = getRidesBetween(activities, lastMonday, lastWeeksTomorrow);

  return [weekActivities, lastWeekActivities];
};

const GLOBAL_STATS: StatEntry[] = [
  activities => {
    const [weekActivities, lastWeekActivities] = getWeeksActivities(activities);
    const weekLoad = getTotalValue(weekActivities, 'suffer_score');
    const lastWeekLoad = getTotalValue(lastWeekActivities, 'suffer_score');
    const difference = Math.abs(weekLoad - lastWeekLoad);

    return {
      label: '🌶️',
      helpText: 'Training load',
      info: `Last week: ${lastWeekLoad}`,
      value: (
        <span>
          {weekLoad}
          <StatTrend marginLeft={5} up={weekLoad >= lastWeekLoad}>
            {difference}
          </StatTrend>
        </span>
      ),
    };
  },
  // activities => {
  //   const [weekActivities, lastWeekActivities] = getWeeksActivities(activities);

  //   return {
  //     label: '🏓',
  //     helpText: 'Activity count',
  //     value: (
  //       <span>
  //         {weekActivities.length}
  //         <StatTrend marginLeft={5} up={weekActivities.length >= lastWeekActivities.length}>
  //           {lastWeekActivities.length}
  //         </StatTrend>
  //       </span>
  //     ),
  //   };
  // },
  activities => {
    const [weekActivities, lastWeekActivities] = getWeeksActivities(activities);
    const weekMovingTime = getTotalValue(weekActivities, 'moving_time');
    const lastWeekMovingTime = getTotalValue(lastWeekActivities, 'moving_time');
    const difference = Math.abs(weekMovingTime - lastWeekMovingTime);

    return {
      label: '⏱️',
      helpText: 'Active time',
      info: `Last week: ${formatDuration(lastWeekMovingTime)}`,
      value: (
        <span>
          {formatDuration(weekMovingTime)}
          <StatTrend marginLeft={5} up={weekMovingTime >= lastWeekMovingTime}>
            {formatDuration(difference)}
          </StatTrend>
        </span>
      ),
    };
  },
  activities => {
    const [weekActivities, lastWeekActivities] = getWeeksActivities(activities);
    const weekDistance = getTotalValue(weekActivities, 'distance');
    const lastWeekDistance = getTotalValue(lastWeekActivities, 'distance');
    const difference = Math.abs(weekDistance - lastWeekDistance);

    return {
      label: '📍',
      helpText: 'Distance',
      info: `Last week: ${formatDistance(lastWeekDistance)}`,
      value: (
        <span>
          {formatDistance(weekDistance)}
          <StatTrend marginLeft={5} up={weekDistance >= lastWeekDistance}>
            {formatDistance(difference)}
          </StatTrend>
        </span>
      ),
    };
  },
];

const STATS: {[key: string]: StatEntry[][]} = {
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
      // activities => ({
      //   label: '🍕',
      //   helpText: 'Calories burned',
      //   value: formatCalories(getTotalValue(activities, 'kilojoules'), false),
      // }),
      activities => ({
        label: '🗺️',
        helpText: 'Avg distance',
        value: formatDistance(
          getAverageValue(
            activities.filter(({commute}) => !commute),
            'distance'
          )
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
        label: '🗺️',
        helpText: 'Avg distance',
        value: formatDistance(getAverageValue(activities, 'distance'), 1),
      }),
      activities => ({
        label: '🌶️',
        helpText: 'Avg suffer score',
        value: Math.round(getAverageValue(activities, 'suffer_score')),
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
        label: '🗺️',
        helpText: 'Avg distance',
        value: formatDistanceMeters(getAverageValue(activities, 'distance')),
      }),
      activities => ({
        label: '🌶️',
        helpText: 'Avg suffer score',
        value: Math.round(getAverageValue(activities, 'suffer_score')),
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
  const [activityMeta] = useActivityMeta();
  const typeActivities = activities?.filter(({sport_type}) => getTypes(currentType).includes(sport_type)) ?? null;

  const toggleTypeChange = () => setTypeIndex((typeIndex + 1) % TYPES.length);

  return (
    <VStack alignItems="stretch">
      <Text textStyle="xl">Week</Text>
      <HStack>
        <WeekChart activities={activities ?? []} />
        {GLOBAL_STATS.map((stat, index) => (
          <StatComponent
            key={index}
            stat={stat}
            activities={activities}
            activityMeta={activityMeta}
            athlete={athlete}
          />
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
              activityMeta={activityMeta}
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
export type {StatEntry};
