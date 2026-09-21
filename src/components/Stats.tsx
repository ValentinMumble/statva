import {useState} from 'react';
import {HStack, SegmentGroupValueChangeDetails, VStack} from '@chakra-ui/react';
import {SegmentedControl} from './ui';
import {useActivities, useActivityMeta, useAthlete} from '../hooks';
import {getTypes, labelCollection, Timeframe, TIMEFRAMES} from '../models';
import {useLabels} from '../hooks';
import {ActivityType} from '../models/strava';
import {StatComponent} from './StatComponent';
import {GLOBAL_STATS, STATS} from './stats-config';
import {SufferTrendChart} from './SufferTrendChart';

const TYPES: ActivityType[] = [ActivityType.Ride, ActivityType.Run, ActivityType.Swim, ActivityType.Tennis];

const Stats = () => {
  const [currentType, setCurrentType] = useState<ActivityType>(TYPES[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const {label} = useLabels();

  const athlete = useAthlete();
  const {activities} = useActivities({
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
  });
  const {activityMeta} = useActivityMeta();
  const typeActivities = activities?.filter(({sport_type}) => getTypes(currentType).includes(sport_type)) ?? null;

  const handleTypeChange = ({value}: SegmentGroupValueChangeDetails) => value && setCurrentType(value as ActivityType);
  const handleTimeframeChange = ({value}: SegmentGroupValueChangeDetails) => value && setTimeframe(value as Timeframe);

  return (
    <VStack alignItems="stretch">
      <HStack>
        <SufferTrendChart activities={activities ?? []} timeframe={timeframe} />
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
      <HStack justifyContent="space-between" gap="8px" flexWrap="wrap" marginTop="10px">
        <SegmentedControl
          size="xs"
          value={currentType}
          onValueChange={handleTypeChange}
          items={labelCollection(TYPES, label).items}
        />
        <SegmentedControl
          size="xs"
          value={timeframe}
          onValueChange={handleTimeframeChange}
          items={labelCollection(Object.keys(TIMEFRAMES), label).items}
        />
      </HStack>
      {STATS[currentType].map((statGroup, index) => (
        <HStack key={index}>
          {statGroup.map((stat, index) => (
            <StatComponent
              key={index}
              stat={stat}
              activities={typeActivities}
              activityMeta={activityMeta}
              athlete={athlete}
            />
          ))}
        </HStack>
      ))}
    </VStack>
  );
};

export {Stats};
