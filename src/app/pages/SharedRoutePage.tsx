import {useMemo} from 'react';
import {Box, Button, HStack, Spinner, Stack, Text} from '@chakra-ui/react';
import {useParams} from 'react-router';
import {useSharedRoute} from '../../hooks';
import {DEFAULT_SETTINGS, decodePolyline} from '../../models';
import {TrackMap} from '../components/TrackMap';
import {duration, km, metres} from '../format';

// Whoever opens a shared link may not use Statva, so the page reads in their own locale.
const LOCALE = navigator.language;

/** What a shared link shows anyone, logged in or not: the route on a map. */
const SharedRoutePage = () => {
  const {routeId} = useParams();
  const route = useSharedRoute(routeId);
  const track = useMemo(() => decodePolyline(route?.map.summary_polyline ?? ''), [route]);

  return (
    <Box position="relative" height="100dvh">
      {undefined === route ? (
        <Stack height="full" alignItems="center" justifyContent="center">
          <Spinner />
        </Stack>
      ) : (
        <>
          <TrackMap tracks={[track]} center={DEFAULT_SETTINGS.mapCenter} height="100dvh" borderRadius="0" borderWidth="0" />
          <Box position="absolute" zIndex={1000} left="12px" right="12px" bottom="calc(16px + env(safe-area-inset-bottom))" maxWidth="420px">
            <Stack gap="8px" background="bg.panel/95" backdropFilter="blur(12px)" borderWidth="1px" borderRadius="card" padding="16px" boxShadow="lg">
              <Text fontFamily="heading" fontWeight="bold" fontSize="lg">
                {route.name}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {km(route.distance, LOCALE)} · {metres(route.elevation_gain, LOCALE)} climbing · about {duration(route.estimated_moving_time)}
              </Text>
              <HStack justifyContent="flex-end">
                <Button asChild={true} size="xs" variant="ghost">
                  <a href="/">Statva 🛹</a>
                </Button>
              </HStack>
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
};

export {SharedRoutePage};
