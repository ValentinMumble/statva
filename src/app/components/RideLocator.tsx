import {useEffect, useRef, useState} from 'react';
import {Box, IconButton, Text} from '@chakra-ui/react';
import {LuLocateFixed, LuLocate} from 'react-icons/lu';
import {Circle, CircleMarker, useMap} from 'react-leaflet';
import {progressAt, RoutePoint} from '../../models';
import {toaster} from '../../components/ui';
import {duration, km, metres, number} from '../format';

type Place = {lat: number; lng: number; accuracy: number; at: number};

type RideLocatorProps = {
  points: RoutePoint[];
  // Seconds from the start to each point, stops included, as the plan has them.
  times: number[];
  start: number;
  locale: string;
  // Hears when the plan has the rider where they are (ms), for the charts; null off the route
  // or once they stop following.
  onPlace?: (plannedAt: number | null) => void;
};

// Within this, the rider is on time (s).
const ON_TIME = 120;
// The blue of a "you are here" dot.
const HERE = '#2f80ed';

/**
 * Follows the rider out on the route: a button on the map turns on the phone's location, shows
 * where they are, keeps them in view, and says how far along they are and how that compares
 * with the plan. Pressed again, it stops.
 */
const RideLocator = ({points, times, start, locale, onPlace}: RideLocatorProps) => {
  const map = useMap();
  const [here, setHere] = useState<Place | null>(null);
  const [following, setFollowing] = useState(false);
  const watch = useRef<number | null>(null);

  const stop = () => {
    if (null !== watch.current) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setFollowing(false);
    setHere(null);
  };
  // Leaving the page stops following.
  useEffect(
    () => () => {
      if (null !== watch.current) navigator.geolocation.clearWatch(watch.current);
    },
    [],
  );

  const toggle = () => {
    if (following) return stop();
    if (!('geolocation' in navigator)) {
      toaster.create({title: 'This browser cannot tell where you are'});
      return;
    }
    let first = true;
    setFollowing(true);
    watch.current = navigator.geolocation.watchPosition(
      ({coords, timestamp}) => {
        const place = {lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, at: timestamp};
        setHere(place);
        // Centred the first time; after that only when the rider leaves the view, so the map can be moved.
        if (first) map.setView([place.lat, place.lng], Math.max(map.getZoom(), 13));
        else if (!map.getBounds().contains([place.lat, place.lng])) map.panTo([place.lat, place.lng]);
        first = false;
      },
      error => {
        toaster.create({title: 'Your location is not available', description: error.message});
        stop();
      },
      {enableHighAccuracy: true, maximumAge: 10000},
    );
  };

  const progress = null === here ? null : progressAt(points, times, start, here, here.at);
  const plannedAt = null === progress || progress.offRoute ? null : progress.plannedAt;
  useEffect(() => onPlace?.(plannedAt), [plannedAt, onPlace]);
  const total = points.at(-1)?.distance ?? 0;
  const timing =
    null === progress
      ? ''
      : Math.abs(progress.behind) < ON_TIME
        ? 'on time'
        : `${duration(Math.abs(progress.behind))} ${0 < progress.behind ? 'behind' : 'ahead of'} plan`;

  return (
    <>
      <Box position="absolute" top="10px" right="10px" zIndex={1000}>
        <IconButton
          aria-label={following ? 'Stop following me' : 'Show where I am on the route'}
          aria-pressed={following}
          size="sm"
          variant="solid"
          colorPalette={following ? 'blue' : 'gray'}
          onClick={toggle}
        >
          {following ? <LuLocateFixed /> : <LuLocate />}
        </IconButton>
      </Box>
      {null !== here && (
        <>
          <Circle
            center={[here.lat, here.lng]}
            radius={here.accuracy}
            pathOptions={{color: HERE, weight: 1, fillColor: HERE, fillOpacity: 0.12}}
          />
          <CircleMarker
            center={[here.lat, here.lng]}
            radius={8}
            pathOptions={{color: 'white', weight: 3, fillColor: HERE, fillOpacity: 1}}
          />
        </>
      )}
      {null !== progress && (
        <Box
          position="absolute"
          left="10px"
          bottom="24px"
          zIndex={1000}
          background="bg.panel"
          borderRadius="8px"
          paddingX="10px"
          paddingY="6px"
          boxShadow="sm"
          maxWidth="calc(100% - 20px)"
        >
          <Text fontSize="sm" fontWeight="semibold">
            {progress.offRoute
              ? `Off the route, ${km(progress.away, locale)} from it`
              : `km ${km(progress.distance, locale).replace(' km', '')} of ${km(total, locale)} · ${km(total - progress.distance, locale)} to go`}
          </Text>
          {!progress.offRoute && (
            <Text fontSize="xs" color="fg.muted">
              {number(progress.done * 100, locale)} % done · {metres(progress.climbLeft, locale)} ↑ to go · {timing}
            </Text>
          )}
        </Box>
      )}
    </>
  );
};

export {HERE, RideLocator};
