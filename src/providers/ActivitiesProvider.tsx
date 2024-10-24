import {useState, ReactNode, createContext, useEffect} from 'react';
import {ITEMS_PER_PAGE, fetchActivities} from '../strava';
import {DetailedActivity} from '../models/strava';

const ActivitiesContext = createContext<
  [DetailedActivity[] | null, (page: number, fetchNext?: boolean, items?: number) => Promise<void>]
>([null, () => Promise.resolve()]);

type ActivitiesProviderProps = {
  children?: ReactNode;
};

const ActivitiesProvider = ({children}: ActivitiesProviderProps) => {
  const [activities, setActivities] = useState<{[id: string]: DetailedActivity} | null>(null);
  const [page, setPage] = useState<number>(1);

  const doFetchActivities = async (page: number, fetchNextPage = false, items?: number) => {
    const activities = await fetchActivities(page, items);
    setActivities(currentActivities => {
      const newActivities = {...currentActivities};
      activities.forEach(activity => (newActivities[activity.id] = activity));

      return newActivities;
    });

    if (fetchNextPage && (items ?? ITEMS_PER_PAGE) === activities.length) {
      doFetchActivities(page + 1, true);
      setPage(page + 1);
    }
  };

  useEffect(() => {
    doFetchActivities(page, true);
  }, []);

  return (
    <ActivitiesContext.Provider value={[null === activities ? null : Object.values(activities), doFetchActivities]}>
      {children}
    </ActivitiesContext.Provider>
  );
};

export {ActivitiesProvider, ActivitiesContext};
