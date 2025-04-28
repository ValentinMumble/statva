import {useEffect, useState} from 'react';
import {Button, createListCollection, Select, SelectValueChangeDetails, VStack} from '@chakra-ui/react';
import {useGeolocation, useRoutes} from '../hooks';
import {Route} from '../models/strava';
import {CheckIn} from '../models';
import {RouteMap} from '../components';
import {Marker} from 'react-leaflet';

const AddCheckIn = () => {
  const routes = useRoutes();
  const [route, setRoute] = useState<Route>();
  const {latitude, longitude, refetch} = useGeolocation();

  const routeCollection = createListCollection({
    items: (routes ?? []).map(route => ({value: route.id.toString(), label: route.name})),
  });

  const handleRouteChange = ({value}: SelectValueChangeDetails) => {
    const selectedRoute = (routes ?? []).find(route => route.id.toString() === value[0]);
    setRoute(selectedRoute);
  };

  const handleCheckIn = () => {
    if (!route || !latitude || !longitude) {
      console.error('Route or location is not available');
      return;
    }

    const checkIn: CheckIn = {
      id: self.crypto.randomUUID(),
      routeId: route.id.toString(),
      date: new Date(),
      lat: latitude,
      lng: longitude,
    };

    //TODO save checkIn to the database
    console.log(checkIn);
  };

  useEffect(() => {
    if (routes && routes.length > 0) {
      setRoute(routes[0]);
    }
  }, [routes]);

  return (
    <VStack padding="10px">
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
      <RouteMap width="100vw" height="50vh" route={route}>
        {latitude && longitude && <Marker position={[latitude, longitude]} />}
      </RouteMap>
      <Button variant="subtle" onClick={refetch}>
        Refresh Location
      </Button>
      <Button variant="subtle" onClick={handleCheckIn}>
        Check-in
      </Button>
    </VStack>
  );
};

export {AddCheckIn};
