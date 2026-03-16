import {useQuery} from '@tanstack/react-query';
import {fetchAthleteRoutes} from '../api';
import {Route} from '../models/strava';

const useRoutes = () => {
  const {data: routes = []} = useQuery<Route[]>({
    queryKey: ['routes'],
    queryFn: fetchAthleteRoutes,
  });

  return routes;
};

export {useRoutes};
