import {useMemo, useState} from 'react';
import {Button, Grid, HStack, Skeleton, Stack, Text} from '@chakra-ui/react';
import {Link} from 'react-router';
import {LuMapPin, LuShare2} from 'react-icons/lu';
import {CheckIns} from '../../components/leaflet';
import {toaster} from '../../components/ui';
import {useRoutes, useSettings, useSharedRoute} from '../../hooks';
import {decodePolyline, getCheckInText} from '../../models';
import {Activity, Route} from '../../models/strava';
import {Card} from '../components/Card';
import {RouteThumb} from '../components/RouteThumb';
import {TrackMap} from '../components/TrackMap';
import {duration, km, metres} from '../format';

// The thumbnail only reads the map and the sport, which a route has the shape of.
const asActivity = (route: Route): Activity => ({...route, sport_type: 'Ride'}) as unknown as Activity;

/** Your Strava routes, each on a map with the check-ins made along it, and a link to share. */
const RoutesPage = () => {
  const routes = useRoutes();
  const {locale, mapCenter} = useSettings();
  const [chosen, setChosen] = useState<number | null>(null);
  const route = routes.find(({id}) => id === chosen) ?? routes[0];
  const {checkIns} = useSharedRoute(undefined === route ? undefined : String(route.id));
  const track = useMemo(() => decodePolyline(route?.map.summary_polyline ?? ''), [route]);
  const lastCheckIn = checkIns.at(-1);

  const handleShare = async () => {
    if (undefined === route) return;

    const url = `${window.location.origin}/routes/${route.id}`;

    if (navigator.share) await navigator.share({title: route.name, url}).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(url);
      toaster.create({title: 'Link copied'});
    }
  };

  return (
    <Stack gap={{base: '16px', md: '24px'}}>
      <HStack justifyContent="space-between" alignItems="baseline" flexWrap="wrap" gap="12px">
        <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
          Routes
        </Text>
        <Button asChild={true} size="sm" variant="outline">
          <Link to="/check-in">
            <LuMapPin /> Check in on a ride
          </Link>
        </Button>
      </HStack>

      {0 === routes.length ? (
        <Skeleton height="360px" borderRadius="card" />
      ) : (
        <Grid templateColumns={{base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 320px'}} gap={{base: '16px', md: '24px'}} alignItems="start">
          <Stack gap="12px">
            {undefined !== route && (
              <>
                <TrackMap tracks={[track]} center={mapCenter} height={{base: '320px', md: '460px'}}>
                  <CheckIns checkIns={checkIns} />
                </TrackMap>
                <Card>
                  <HStack justifyContent="space-between" alignItems="flex-start" gap="12px" flexWrap="wrap">
                    <Stack gap="2px">
                      <Text fontFamily="heading" fontWeight="semibold" fontSize="lg">
                        {route.name}
                      </Text>
                      <Text color="fg.muted" fontSize="sm">
                        {km(route.distance, locale)} · {metres(route.elevation_gain, locale)} climbing · about{' '}
                        {duration(route.estimated_moving_time)}
                      </Text>
                      <Text fontSize="sm">📌 {undefined === lastCheckIn ? 'No check-in yet' : getCheckInText(lastCheckIn, true)}</Text>
                    </Stack>
                    <Button size="sm" colorPalette="brand" onClick={handleShare}>
                      <LuShare2 /> Share
                    </Button>
                  </HStack>
                </Card>
              </>
            )}
          </Stack>
          <Card padding="8px">
            <Stack gap="2px" maxHeight={{lg: '560px'}} overflowY="auto">
              {routes.map(item => (
                <HStack
                  key={item.id}
                  as="button"
                  gap="12px"
                  padding="8px"
                  borderRadius="10px"
                  textAlign="left"
                  background={item.id === route?.id ? 'bg.muted' : 'transparent'}
                  _hover={{background: 'bg.subtle'}}
                  onClick={() => setChosen(item.id)}
                >
                  <RouteThumb activity={asActivity(item)} size={44} />
                  <Stack gap="0" minWidth="0">
                    <Text fontWeight="medium" truncate={true}>
                      {item.name}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {km(item.distance, locale)} · {metres(item.elevation_gain, locale)}
                    </Text>
                  </Stack>
                </HStack>
              ))}
            </Stack>
          </Card>
        </Grid>
      )}
    </Stack>
  );
};

export {RoutesPage};
