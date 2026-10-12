import {useQuery} from '@tanstack/react-query';
import {Route} from '../models/strava';
import {getFetcher} from './useFetcher';

const fetchAthleteRoutes = getFetcher<Route[]>('routes.get');

const useRoutes = () => {
  const {data: routes = []} = useQuery<Route[]>({
    queryKey: ['routes'],
    queryFn: fetchAthleteRoutes,
    retry: false,
  });

  return routes;
};

export {useRoutes};
