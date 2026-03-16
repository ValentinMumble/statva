import {useNavigate} from 'react-router';
import {Avatar, Button, Drawer, Text, List, Portal, Skeleton, CloseButton} from '@chakra-ui/react';
import {Route} from '../models/strava';


type RouteDrawerProps = {
  selectedRoute: Route | undefined;
  routes: Route[];
  defaultOpen?: boolean;
};

const RouteDrawer = ({routes, selectedRoute, defaultOpen}: RouteDrawerProps) => {
  const navigate = useNavigate();

  const handleRouteClick = (route: Route) => () => {
    navigate(`/routes/${route.id}`);
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
              <List.Root gap="10px" variant="plain">
                {0 === routes.length
                  ? [...new Array(20)].map((_, index) => (
                      <Skeleton key={index}>
                        <List.Item key={index}>Loading...</List.Item>
                      </Skeleton>
                    ))
                  : routes.map(route => (
                      <List.Item key={route.id} onClick={handleRouteClick(route)} alignItems="center" gap="10px">
                        <Avatar.Root
                          size="sm"
                          shape="rounded"
                          outlineStyle="solid"
                          outlineWidth="2px"
                          outlineColor={selectedRoute?.id === route.id ? 'orange.600' : 'transparent'}
                        >
                          <Avatar.Image src={route.map_urls.dark_url} />
                        </Avatar.Root>
                        <Text fontSize="15px">{route.name}</Text>
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
