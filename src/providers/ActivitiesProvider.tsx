import {useState, ReactNode, createContext, useEffect} from 'react';
import {Activity, DetailedActivity} from '../models/strava';
import {useFetcher} from '../hooks';

const ActivitiesContext = createContext<
  [Activity[] | null, (page: number, fetchNext?: boolean, items?: number) => Promise<void>, (id: number) => void]
>([null, Promise.resolve, Promise.resolve]);

type ActivitiesProviderProps = {
  children?: ReactNode;
};

const ActivitiesProvider = ({children}: ActivitiesProviderProps) => {
  const [activities, setActivities] = useState<Record<string, Activity | DetailedActivity> | null>(null);
  const getActivities = useFetcher<[Activity[], boolean]>('activities.get');
  const getActivityMeta = useFetcher<Record<string, DetailedActivity>>('activities.meta.get');

  const fetchActivities = async (page: number, fetchNextPage = false, items?: number) => {
    const [activities, hasMore] = await getActivities(page, items);
    setActivities(currentActivities => {
      const newActivities = {...currentActivities};
      activities.forEach(activity => (newActivities[activity.id] = activity));

      return newActivities;
    });

    if (fetchNextPage && hasMore) {
      fetchActivities(page + 1, true);
    }
  };

  const deleteActivity = (id: number) =>
    setActivities(currentActivities => {
      const newActivities = {...currentActivities};
      delete newActivities[id];

      return newActivities;
    });

  useEffect(() => {
    const initializeActivities = async () => {
      // First, load cached metadata for instant display
      const meta = await getActivityMeta();
      if (meta && Object.keys(meta).length > 0) {
        setActivities(meta);
      } else {
        setActivities(null);
      }

      // Then fetch fresh activities from the API
      fetchActivities(1, true);
    };

    initializeActivities();
  }, [getActivities, getActivityMeta]);

  return (
    <ActivitiesContext.Provider
      value={[null === activities ? null : Object.values(activities) as Activity[], fetchActivities, deleteActivity]}
    >
      {children}
    </ActivitiesContext.Provider>
  );
};

export {ActivitiesProvider, ActivitiesContext};
