import {useParams} from 'react-router';
import {VStack} from '@chakra-ui/react';
import {useRoutes} from '../hooks';
import {PolylineMap, RouteCard, RouteDrawer} from '../components';

const Routes = () => {
  const {routeId} = useParams();
  const routes = useRoutes();
  const selectedRoute = routes?.find(route => route.id === Number(routeId));

  return (
    <>
      <PolylineMap width="100vw" height="100vh" polyline={selectedRoute?.map.summary_polyline} />
      <VStack position="absolute" zIndex={1000} top="0" left="0" padding="12px" gap="12px" align="start">
        <RouteCard route={selectedRoute} />
        <RouteDrawer routes={routes} defaultOpen={undefined === routeId} />
      </VStack>
    </>
  );
};

export {Routes};
