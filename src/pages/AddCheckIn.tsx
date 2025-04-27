import {useEffect, useState} from 'react';
import {Button, Image, createListCollection, Select, SelectValueChangeDetails, VStack} from '@chakra-ui/react';
import {useRoutes} from '../hooks';
import {Route} from '../models/strava';
import {CheckIn} from '../models';

const AddCheckIn = () => {
  const routes = useRoutes();
  const [route, setRoute] = useState<Route>();

  const routeCollection = createListCollection({
    items: (routes ?? []).map(route => ({value: route.id.toString(), label: route.name})),
  });

  const handleRouteChange = ({value}: SelectValueChangeDetails) => {
    const selectedRoute = (routes ?? []).find(route => route.id.toString() === value[0]);
    setRoute(selectedRoute);
  };

  const handleCheckIn = () => {
    if (!route) return;

    const checkIn: CheckIn = {
      id: self.crypto.randomUUID(),
      routeId: route.id.toString(),
      date: new Date(),
      // Nantes
      lat: 48.8566,
      lng: 2.3522,
    };

    console.log(checkIn);
  };

  useEffect(() => {
    if (routes && routes.length > 0) {
      setRoute(routes[0]);
    }
  }, [routes]);

  return (
    <VStack>
      <Select.Root
        value={route ? [route.id.toString()] : undefined}
        onValueChange={handleRouteChange}
        collection={routeCollection}
      >
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select a route" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {routeCollection.items.map(route => (
              <Select.Item item={route} key={route.value}>
                {route.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
      <Image src={route?.map_urls.dark_url} />
      <Button variant="outline" onClick={handleCheckIn}>
        Check-in
      </Button>
    </VStack>
  );
};

export {AddCheckIn};
