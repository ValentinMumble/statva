import {useQuery} from '@tanstack/react-query';
import {Route} from '../models/strava';
import {getFetcher} from './useFetcher';

const fetchSharedRoute = getFetcher<{route: Route}>('routes.shared');

/** A route as anyone with the share link sees it, logged in or not. */
const useSharedRoute = (routeId: string | undefined) => {
  const {data} = useQuery({
    queryKey: ['sharedRoute', routeId],
    queryFn: () => fetchSharedRoute(routeId ?? ''),
    enabled: undefined !== routeId,
    retry: false,
  });

  return data?.route;
};

export {useSharedRoute};
