import {useParams} from 'react-router';
import {VStack} from '@chakra-ui/react';
import {useRoutes} from '../hooks';
import {PolylineMap, RouteCard, RouteDrawer} from '../components';
import {EmojiMarker} from '../components/leaflet';

type CheckIn = {
  lat: number;
  lng: number;
  date: Date;
};

const checkIns: CheckIn[] = [
  {lat: 47.23, lng: -1.55, date: new Date('2023-10-01T10:00:00Z')},
  {lat: 47.24, lng: -1.56, date: new Date('2023-10-02T10:00:00Z')},
  {lat: 47.25, lng: -1.57, date: new Date('2023-10-03T10:00:00Z')},
  {lat: 47.26, lng: -1.58, date: new Date('2023-10-04T10:00:00Z')},
];

const getCheckInText = (checkIn: CheckIn, isLast: boolean) => {
  const date = checkIn.date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const time = checkIn.date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${isLast ? 'Last Check-in: ' : ''}${date} ${time}`;
};

const Routes = () => {
  const {routeId} = useParams();
  const routes = useRoutes();
  const selectedRoute = routes?.find(route => route.id === Number(routeId));

  return (
    <>
      <PolylineMap width="100vw" height="100vh" polyline={selectedRoute?.map.summary_polyline}>
        {checkIns.map((checkIn, index) => (
          <EmojiMarker
            key={index}
            opacity={index === checkIns.length - 1 ? 1 : 0.5}
            position={checkIn}
            emoji="📌"
            popup={getCheckInText(checkIn, index === checkIns.length - 1)}
          />
        ))}
      </PolylineMap>
      <VStack position="absolute" zIndex={1000} top="0" left="0" padding="12px" gap="12px" align="start">
        <RouteCard route={selectedRoute} />
        <RouteDrawer selectedRoute={selectedRoute} routes={routes} defaultOpen={undefined === routeId} />
      </VStack>
    </>
  );
};

export {Routes};
