import {useEffect, useState} from 'react';
import {fetchAthleteRoutes} from '../api';
import {Route} from '../models/strava';

const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[] | null>(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      const routes = await fetchAthleteRoutes();

      setRoutes(routes);
    };

    fetchRoutes();
  }, []);

  return routes;
};

export {useRoutes};
