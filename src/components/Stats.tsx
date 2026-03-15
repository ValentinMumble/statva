import {useState} from 'react';
import {VStack, HStack, Text} from '@chakra-ui/react';
import {useActivities, useActivityMeta, useAthlete} from '../hooks';
import {getTypes, Timeframe} from '../models';
import {ActivityType} from '../models/strava';
import {StatComponent} from './StatComponent';
import {GLOBAL_STATS, STATS} from './stats-config';
import {SufferTrendChart} from './SufferTrendChart';

const TYPES: ActivityType[] = [ActivityType.Ride, ActivityType.Run, ActivityType.Swim, ActivityType.Tennis];

const Stats = () => {
  const [typeIndex, setTypeIndex] = useState<number>(0);
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
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

  const toggleTimeframe = () => {
    const timeframes: Timeframe[] = ['week', 'month', 'year', 'day'];
    setTimeframe(timeframes[(timeframes.indexOf(timeframe) + 1) % timeframes.length]);
  };

  return (
    <VStack alignItems="stretch">
      <HStack>
        <SufferTrendChart activities={activities ?? []} timeframe={timeframe} onClick={toggleTimeframe} />
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
