import {StatGroup, Stat, StatLabel, StatNumber, StatHelpText, VStack, Skeleton} from '@chakra-ui/react';
import {useActivities, useAthlete} from '../hooks';
import {STATS} from '../models';

const Stats = () => {
  const [activities, isActivityLoading] = useActivities({withCommute: true, withPrivate: true});
  const athlete = useAthlete();

  const isLoading = null === athlete || isActivityLoading;

  return (
    <VStack alignItems="stretch">
      {STATS.map((statGroup, index) => (
        <StatGroup key={index}>
          {statGroup.map(stat => (
            <Stat key={stat.label} size={['sm', 'md']}>
              <StatLabel>{stat.label}</StatLabel>
              {isLoading ? (
                <Skeleton width="70%">
                  <StatNumber>Loading</StatNumber>
                </Skeleton>
              ) : (
                <StatNumber>{stat.number(activities, athlete)}</StatNumber>
              )}
              <StatHelpText fontSize={['xs', 'sm']}>{stat.helpText}</StatHelpText>
            </Stat>
          ))}
        </StatGroup>
      ))}
    </VStack>
  );
};

export {Stats};
