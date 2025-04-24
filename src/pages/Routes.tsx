import {HStack, VStack} from '@chakra-ui/react';
import {useRoutes} from '../hooks';
import {useState} from 'react';
import {PolylineMap} from '../components';
import {Route} from '../models/strava';

const Routes = () => {
  const routes = useRoutes();
  const [selectedRoute, setSelectedRoute] = useState<Route | null>();

  const handleRouteClick = (route: Route) => () => {
    setSelectedRoute(route);
    console.log(selectedRoute);
  };

  return (
    <HStack>
      <VStack>
        {routes.map(route => (
          <div onClick={handleRouteClick(route)} key={route.id}>
            {route.name}
          </div>
        ))}
      </VStack>
      <VStack flex={1}>
        <PolylineMap polyline={selectedRoute?.map.summary_polyline ?? null} />
      </VStack>
    </HStack>
  );
};

export {Routes};
