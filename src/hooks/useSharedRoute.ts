import {useQuery} from '@tanstack/react-query';
import {CheckIn} from '../models';
import {Route} from '../models/strava';
import {getFetcher} from './useFetcher';

const fetchSharedRoute = getFetcher<{route: Route; checkIns: CheckIn[]}>('routes.shared');

/** A route and its check-ins, as anyone with the share link sees them, logged in or not. */
const useSharedRoute = (routeId: string | undefined) => {
  const {data} = useQuery({
    queryKey: ['sharedRoute', routeId],
    queryFn: () => fetchSharedRoute(routeId ?? ''),
    enabled: undefined !== routeId,
    retry: false,
  });

  return {
    route: data?.route,
    checkIns: (data?.checkIns ?? [])
      .map(checkIn => ({...checkIn, date: new Date(checkIn.date)}))
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
  };
};

export {useSharedRoute};
