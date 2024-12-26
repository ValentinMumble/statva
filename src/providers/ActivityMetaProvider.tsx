import {useState, ReactNode, createContext, useEffect} from 'react';
import {DetailedActivity} from '../models/strava';
import {useFetcher} from '../hooks';

const ActivityMetaContext = createContext<[Record<string, DetailedActivity>, () => Promise<void>]>([
  {},
  Promise.resolve,
]);

type ActivityMetaProviderProps = {
  children?: ReactNode;
};

const ActivityMetaProvider = ({children}: ActivityMetaProviderProps) => {
  const [activityMeta, setActivityMeta] = useState<Record<string, DetailedActivity>>({});
  const getActivities = useFetcher<Record<string, DetailedActivity>>('activities.meta.get');

  const fetchActivityMeta = async () => {
    setActivityMeta(await getActivities());
  };

  useEffect(() => {
    fetchActivityMeta();
  }, [getActivities]);

  return (
    <ActivityMetaContext.Provider value={[activityMeta, fetchActivityMeta]}>{children}</ActivityMetaContext.Provider>
  );
};

export {ActivityMetaProvider, ActivityMetaContext};
