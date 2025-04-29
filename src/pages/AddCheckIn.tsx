import {useEffect, useState} from 'react';
import {Button, createListCollection, Select, SelectValueChangeDetails, VStack, Clipboard} from '@chakra-ui/react';
import {TbCircleCheck, TbCurrentLocation} from 'react-icons/tb';
import {LocationMarker, RouteMap} from '../components';
import {toaster} from '../components/ui';
import {useGeolocation, useRoutes} from '../hooks';
import {CheckIn} from '../models';
import {Route} from '../models/strava';
import {addCheckIn} from '../api';

const ROUTES_URL = 'https://statva.vumble.dev/routes';

const generateShareUrl = (route: Route | undefined) => {
  return route ? `${ROUTES_URL}/${route.id}` : ROUTES_URL;
};

const AddCheckIn = () => {
  const routes = useRoutes();
  const [route, setRoute] = useState<Route>();
  const [[latitude, longitude], fetchLocation] = useGeolocation();

  const routeCollection = createListCollection({
    items: (routes ?? []).map(route => ({value: route.id.toString(), label: route.name})),
  });

  const handleRouteChange = ({value}: SelectValueChangeDetails) => {
    const selectedRoute = (routes ?? []).find(route => route.id.toString() === value[0]);
    setRoute(selectedRoute);
  };

  const handleCheckIn = async () => {
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

    await addCheckIn(checkIn);
    toaster.create({title: `✅ Checked-in`});
    console.log(checkIn);
  };

  const handleShareLink = async () => {
    await navigator.share({title: 'View route', url: generateShareUrl(route)});
  };

  useEffect(() => {
    if (routes && routes.length > 0) {
      setRoute(routes[0]);
    }
  }, [routes]);

  return (
    <VStack height="80vh" width="100vw" overflow="hidden" gap="30px" justifyContent="center">
      <Select.Root
        padding="0 2px"
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
              <Select.Item key={route.value} item={route}>
                {route.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
      <RouteMap width="100%" height="50%" route={route}>
        {latitude && longitude && <LocationMarker position={[latitude, longitude]} emoji="📍" />}
      </RouteMap>
      <VStack alignItems="stretch" gap="30px">
        <Button variant="outline" size="xl" onClick={fetchLocation}>
          Refresh location <TbCurrentLocation />
        </Button>
        <Clipboard.Root value={generateShareUrl(route)} >
          <Clipboard.Trigger>
            <Button variant="outline" size="xl" onClick={handleShareLink} width="full" disabled={!route}>
              Share link
              <Clipboard.Indicator />
            </Button>
          </Clipboard.Trigger>
        </Clipboard.Root>
        <Button colorPalette="green"  variant="outline" size="xl" onClick={handleCheckIn} disabled={!route || !latitude || !longitude}>
          Check-in <TbCircleCheck />
        </Button>
      </VStack>
    </VStack>
  );
};

export {AddCheckIn};
