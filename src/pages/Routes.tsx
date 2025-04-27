import {useParams} from 'react-router';
import {VStack} from '@chakra-ui/react';
import {useCheckIns, useRoutes} from '../hooks';
import {PolylineMap, RouteCard, RouteDrawer, CheckIns} from '../components';

const Routes = () => {
  const {routeId} = useParams();
  const routes = useRoutes();
  const checkIns = useCheckIns(routeId);
  const selectedRoute = routes?.find(route => route.id === Number(routeId));

  return (
    <>
      <PolylineMap width="100vw" height="100vh" polyline={selectedRoute?.map.summary_polyline}>
        <CheckIns checkIns={checkIns} />
      </PolylineMap>
      <VStack position="absolute" zIndex={1000} top="0" left="0" padding="12px" gap="12px" align="start">
        <RouteCard route={selectedRoute} />
        <RouteDrawer selectedRoute={selectedRoute} routes={routes} defaultOpen={undefined === routeId} />
      </VStack>
    </>
  );
};

export {Routes};
