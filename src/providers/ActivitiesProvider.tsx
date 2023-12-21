import {useState, ReactNode, createContext, useEffect} from 'react';
import {ITEMS_PER_PAGE, fetchActivities} from '../strava';
import {DetailedActivity} from '../models/strava';

const ActivitiesContext = createContext<[DetailedActivity[], boolean]>([[], true]);

type ActivitiesProviderProps = {
  children?: ReactNode;
};

const ActivitiesProvider = ({children}: ActivitiesProviderProps) => {
  const [activities, setActivities] = useState<DetailedActivity[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    const doFetchActivities = async (page: number) => {
      setLoading(true);

      const activities = await fetchActivities(page);
      setActivities(currentActivities => [...currentActivities, ...activities]);

      if (ITEMS_PER_PAGE === activities.length) {
        doFetchActivities(page + 1);
        setPage(page + 1);
      }

      setLoading(false);
    };

    doFetchActivities(page);
  }, []);

  return <ActivitiesContext.Provider value={[activities, isLoading]}>{children}</ActivitiesContext.Provider>;
};

export {ActivitiesProvider, ActivitiesContext};
