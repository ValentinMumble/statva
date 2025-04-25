import {useNavigate, useParams} from 'react-router';
import {Button, Card, Drawer, List, Portal, VStack} from '@chakra-ui/react';
import {LuCircleCheck, LuCircleDashed} from 'react-icons/lu';
import {useLabels, useRoutes} from '../hooks';
import {PolylineMap} from '../components';
import {Route} from '../models/strava';
import {formatDistance, formatDuration, formatElevation} from '../models';
import {CloseButton} from '../components/ui/close-button';

const Routes = () => {
  const {routeId} = useParams();
  const navigate = useNavigate();
  const routes = useRoutes();
  const [label] = useLabels();

  const handleRouteClick = (route: Route) => () => {
    navigate(`/routes/${route.id}`);
    console.log(route);
  };

  const selectedRoute = routes.find(route => route.id === Number(routeId));

  return (
    <VStack flex={1}>
      <Drawer.Root size="xs" placement="start" defaultOpen={undefined === routeId}>
        <Drawer.Trigger asChild>
          <Button variant="outline" size="sm">
            Open Routes
          </Button>
        </Drawer.Trigger>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Select a route</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <List.Root gap="2" variant="plain" align="start">
                  {
                    //TODO: add loading state
                    routes.map(route => (
                      <List.Item key={route.id} onClick={handleRouteClick(route)}>
                        <List.Indicator color="orange.500">
                          {route === selectedRoute ? <LuCircleCheck /> : <LuCircleDashed />}
                        </List.Indicator>
                        {route.name}
                      </List.Item>
                    ))
                  }
                </List.Root>
              </Drawer.Body>
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
      {selectedRoute && (
        <Card.Root>
          <Card.Body gap="2">
            <Card.Title>{selectedRoute.name}</Card.Title>
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
      <PolylineMap polyline={selectedRoute?.map.summary_polyline} />
    </VStack>
  );
};

export {Routes};
