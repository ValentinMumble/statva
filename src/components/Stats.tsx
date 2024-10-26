import {useState} from 'react';
import {VStack, Skeleton, HStack} from '@chakra-ui/react';
import {useActivities, useAthlete} from '../hooks';
import {getTypes, STATS} from '../models';
import {ActivityType} from '../models/strava';
import {StatHelpText, StatLabel, StatRoot, StatValueText} from '../components/ui';

const TYPES = ['Ride', 'Run', 'Swim', 'Tennis'];

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
            <StatRoot key={stat.label} size={['sm']}>
              <StatLabel>{stat.label}</StatLabel>
              {isLoading ? (
                <Skeleton width="70%">
                  <StatHelpText>Loading</StatHelpText>
                </Skeleton>
              ) : (
                <StatValueText fontSize="1.2em">{stat.number(activities, athlete)}</StatValueText>
              )}
              <StatHelpText fontSize={['sm']}>{stat.helpText}</StatHelpText>
            </StatRoot>
          ))}
        </HStack>
      ))}
    </VStack>
  );
};

export {Stats};
