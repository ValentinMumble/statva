import {Link, useParams} from 'react-router';
import {IconButton, VStack} from '@chakra-ui/react';
import {MdArrowBack} from 'react-icons/md';
import {useRoutes, useSharedRoute} from '../hooks';
import {RouteMap, RouteCard, RouteDrawer, CheckIns} from '../components';

const Routes = () => {
  const {routeId} = useParams();
  // The route list needs a login; the shared route itself does not, so a link works for anyone.
  const routes = useRoutes();
  const {route: sharedRoute, checkIns} = useSharedRoute(routeId);
  const selectedRoute = sharedRoute ?? routes.find(route => route.id === Number(routeId));

  return (
    <>
      <RouteMap width="100vw" height="100vh" route={selectedRoute}>
        <CheckIns checkIns={checkIns} />
      </RouteMap>
      <VStack position="absolute" zIndex={1000} top="0" left="0" padding="12px" gap="12px" align="start">
        <IconButton asChild={true} title="Back to rides" size="sm" backgroundColor="blackAlpha.800" color="white">
          <Link to="/">
            <MdArrowBack />
          </Link>
        </IconButton>
        <RouteCard route={selectedRoute} checkIns={checkIns} />
        {0 < routes.length && (
          <RouteDrawer selectedRoute={selectedRoute} routes={routes} defaultOpen={undefined === routeId} />
        )}
      </VStack>
    </>
  );
};

export {Routes};
