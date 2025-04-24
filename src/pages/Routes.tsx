import {Card, HStack, List} from '@chakra-ui/react';
import {LuCircleCheck, LuCircleDashed} from 'react-icons/lu';
import {useLabels, useRoutes} from '../hooks';
import {useState} from 'react';
import {PolylineMap} from '../components';
import {Route} from '../models/strava';
import {formatDistance, formatDuration, formatElevation} from '../models';

const Routes = () => {
  const routes = useRoutes();
  const [selectedRoute, setSelectedRoute] = useState<Route | null>();
  const [label] = useLabels();

  const handleRouteClick = (route: Route) => () => {
    setSelectedRoute(route);
    console.log(selectedRoute);
  };

  return (
    <HStack>
      <List.Root gap="2" variant="plain" align="start">
        {routes.map(route => (
          <List.Item key={route.id} onClick={handleRouteClick(route)}>
            <List.Indicator color="orange.500">
              {route === selectedRoute ? <LuCircleCheck /> : <LuCircleDashed />}
            </List.Indicator>{' '}
            {route.name}
          </List.Item>
        ))}
      </List.Root>
      <HStack flex={1}>
        <PolylineMap polyline={selectedRoute?.map.summary_polyline} />
        {selectedRoute && (
          <Card.Root width="320px">
            <Card.Body gap="2">
              <Card.Title mt="2">{selectedRoute.name}</Card.Title>
              <Card.Description>
                {label('distance')} {formatDistance(selectedRoute.distance)}
                <br />
                {label('total_elevation_gain')} {formatElevation(selectedRoute.elevation_gain)}
                <br />
                {label('moving_time')} {formatDuration(selectedRoute.estimated_moving_time)}
              </Card.Description>
            </Card.Body>
          </Card.Root>
        )}
      </HStack>
    </HStack>
  );
};

export {Routes};
