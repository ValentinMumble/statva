import {useState, ReactNode, createContext, useEffect} from 'react';
import {DetailedActivity} from '../models';
import {fetchAllActivities} from '../strava';

const ActivitiesContext = createContext<[DetailedActivity[], boolean]>([[], false]);

type ActivitiesProviderProps = {
  children?: ReactNode;
};

const ActivitiesProvider = ({children}: ActivitiesProviderProps) => {
  const [activities, setActivities] = useState<DetailedActivity[]>([]);
  const [isLoading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);

      const activities = await fetchAllActivities();

      setActivities(activities);
      setLoading(false);
    };

    fetchActivities();
  }, []);

  return <ActivitiesContext.Provider value={[activities, isLoading]}>{children}</ActivitiesContext.Provider>;
};

export {ActivitiesProvider, ActivitiesContext};
