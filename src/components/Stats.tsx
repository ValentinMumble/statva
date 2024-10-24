import {useState} from 'react';
import {StatGroup, Stat, StatLabel, StatNumber, StatHelpText, VStack, Skeleton} from '@chakra-ui/react';
import {useActivities, useAthlete} from '../hooks';
import {getTypes, STATS} from '../models';
import {ActivityType} from '../models/strava';

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
