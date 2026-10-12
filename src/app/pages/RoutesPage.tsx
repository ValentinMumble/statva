import {useMemo, useState} from 'react';
import {Button, Grid, HStack, Skeleton, Stack, Text} from '@chakra-ui/react';
import {LuShare2} from 'react-icons/lu';
import {toaster} from '../../components/ui';
import {useRoutes, useSettings} from '../../hooks';
import {decodePolyline} from '../../models';
import {Activity, Route} from '../../models/strava';
import {Card} from '../components/Card';
import {RouteThumb} from '../components/RouteThumb';
import {TrackMap} from '../components/TrackMap';
import {duration, km, metres} from '../format';

// The thumbnail only reads the map and the sport, which a route has the shape of.
const asActivity = (route: Route): Activity => ({...route, sport_type: 'Ride'}) as unknown as Activity;

/** Your Strava routes, each on a map, with a link to share. */
const RoutesPage = () => {
  const routes = useRoutes();
  const {locale, mapCenter} = useSettings();
  const [chosen, setChosen] = useState<number | null>(null);
  const route = routes.find(({id}) => id === chosen) ?? routes[0];
  const track = useMemo(() => decodePolyline(route?.map.summary_polyline ?? ''), [route]);

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
      </HStack>

      {0 === routes.length ? (
        <Skeleton height="360px" borderRadius="card" />
      ) : (
        <Grid templateColumns={{base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 320px'}} gap={{base: '16px', md: '24px'}} alignItems="start">
          <Stack gap="12px">
            {undefined !== route && (
              <>
                <TrackMap tracks={[track]} center={mapCenter} height={{base: '320px', md: '460px'}} />
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
