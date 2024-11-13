import {useState, ReactNode, createContext, useEffect} from 'react';
import {Activity} from '../models/strava';
import {useFetcher} from '../hooks';

const ActivitiesContext = createContext<
  [Activity[] | null, (page: number, fetchNext?: boolean, items?: number) => Promise<void>]
>([null, () => Promise.resolve()]);

type ActivitiesProviderProps = {
  children?: ReactNode;
};

const ActivitiesProvider = ({children}: ActivitiesProviderProps) => {
  const [activities, setActivities] = useState<{[id: string]: Activity} | null>(null);
  const [page, setPage] = useState<number>(1);
  const getActivities = useFetcher<[Activity[], boolean]>('activities.get');

  const fetchActivities = async (page: number, fetchNextPage = false, items?: number) => {
    const [activities, hasMore] = await getActivities(page, items);
    setActivities(currentActivities => {
      const newActivities = {...currentActivities};
      activities.forEach(activity => (newActivities[activity.id] = activity));

      return newActivities;
    });

    if (fetchNextPage && hasMore) {
      fetchActivities(page + 1, true);
      setPage(page + 1);
    }
  };

  useEffect(() => {
    setActivities(null);
    setPage(1);
    fetchActivities(page, true);
  }, [getActivities]);

  return (
    <ActivitiesContext.Provider value={[null === activities ? null : Object.values(activities), fetchActivities]}>
      {children}
    </ActivitiesContext.Provider>
  );
};

export {ActivitiesProvider, ActivitiesContext};
