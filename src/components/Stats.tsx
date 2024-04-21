import {StatGroup, Stat, StatLabel, StatNumber, StatHelpText, VStack, Skeleton} from '@chakra-ui/react';
import {useActivities, useAthlete} from '../hooks';
import {STATS} from '../models';
import {ActivityType} from '../models/strava';

const Stats = () => {
  const [activities, isActivityLoading] = useActivities({
    withPrivate: true,
    includedActivityTypes: [ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide],
  });
  const athlete = useAthlete();

  const isLoading = null === athlete || isActivityLoading;

  return (
    <VStack alignItems="stretch">
      {STATS.map((statGroup, index) => (
        <StatGroup key={index}>
          {statGroup.map(stat => (
            <Stat key={stat.label} size={['sm']}>
              <StatLabel>{stat.label}</StatLabel>
              {isLoading ? (
                <Skeleton width="70%">
                  <StatNumber>Loading</StatNumber>
                </Skeleton>
              ) : (
                <StatNumber fontSize="1.2em">{stat.number(activities, athlete)}</StatNumber>
              )}
              <StatHelpText fontSize={['sm']}>{stat.helpText}</StatHelpText>
            </Stat>
          ))}
        </StatGroup>
      ))}
    </VStack>
  );
};

export {Stats};
