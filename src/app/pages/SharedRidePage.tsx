import {Box, Center, Spinner, Stack, Text} from '@chakra-ui/react';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router';
import {SharedRide} from '../../api';
import {getFetcher} from '../../hooks/useFetcher';
import {useRideTiming} from '../../hooks/useRideTiming';
import {Card} from '../components/Card';
import {RideTimingFields} from '../components/RideTimingFields';
import {RideWeatherResults} from '../components/RideWeatherResults';

const fetchSharedRide = getFetcher<SharedRide>('ride.shared');

/**
 * The shared ride, with its day, start and speed to change here: they start as shared, and
 * a change stays on this page, never in the link.
 */
const SharedRideWeather = ({shared, locale}: {shared: SharedRide; locale: string}) => {
  const timing = useRideTiming(shared.route, shared.pace, shared.start);

  return (
    <>
      <Card>
        <RideTimingFields timing={timing} locale={locale} ownLabel="the shared speed" />
      </Card>
      {!Number.isNaN(timing.start) && (
        <RideWeatherResults
          route={timing.route ?? shared.route}
          start={timing.start}
          pace={timing.pace}
          locale={locale}
        />
      )}
    </>
  );
};

/**
 * A ride shared from Ride weather, for anyone with its link, with no login: the route, start
 * and pace the rider chose, with the forecast fetched fresh here.
 */
const SharedRidePage = () => {
  const {shareId = ''} = useParams();
  const shared = useQuery({
    queryKey: ['sharedRide', shareId],
    queryFn: () => fetchSharedRide(shareId),
    retry: false,
    staleTime: Infinity,
  });

  return (
    <Box maxWidth="1400px" marginX="auto" paddingX={{base: '16px', md: '32px'}} paddingY={{base: '16px', md: '32px'}}>
      <Stack gap={{base: '16px', md: '24px'}}>
        <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
          Ride weather
        </Text>
        {shared.isPending && (
          <Center paddingY="48px">
            <Spinner />
          </Center>
        )}
        {shared.isError && (
          <Text color="fg.muted">This ride is not shared any more: links last 30 days. Ask for a new one.</Text>
        )}
        {undefined !== shared.data && <SharedRideWeather shared={shared.data} locale={navigator.language} />}
      </Stack>
    </Box>
  );
};

export {SharedRidePage};
