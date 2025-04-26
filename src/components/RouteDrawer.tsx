import {useNavigate} from 'react-router';
import {Avatar, Button, Drawer, Text, List, Portal, Skeleton} from '@chakra-ui/react';
import {CloseButton} from './ui/close-button';
import {Route} from '../models/strava';

type RouteDrawerProps = {
  routes: Route[] | null;
  defaultOpen?: boolean;
};

const RouteDrawer = ({routes, defaultOpen}: RouteDrawerProps) => {
  const navigate = useNavigate();

  const handleRouteClick = (route: Route) => () => {
    navigate(`/routes/${route.id}`);
    console.log(route);
  };

  return (
    <Drawer.Root size="xs" placement="start" defaultOpen={defaultOpen}>
      <Drawer.Trigger asChild={true}>
        <Button size="sm" variant="outline" backgroundColor="blackAlpha.800">
          Change route
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
                {null === routes
                  ? [...new Array(20)].map((_, index) => (
                      <Skeleton key={index}>
                        <List.Item key={index}>Loading...</List.Item>
                      </Skeleton>
                    ))
                  : routes.map(route => (
                      <List.Item key={route.id} onClick={handleRouteClick(route)} alignItems="center" gap="2">
                        <Avatar.Root size="sm" shape="rounded">
                          <Avatar.Image src={route.map_urls.dark_url} />
                        </Avatar.Root>
                        <Text fontSize="15px">
                          {route.name}
                        </Text>
                      </List.Item>
                    ))}
              </List.Root>
            </Drawer.Body>
            <Drawer.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Drawer.CloseTrigger>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
};

export {RouteDrawer};
