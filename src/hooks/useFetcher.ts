import {
  deleteEvent,
  deleteLabel,
  fetchActivities,
  fetchAthlete,
  getEvents,
  getFTPTests,
  getLabels,
  upsertEvent,
  upsertFTPTest,
  upsertLabel,
} from '../api';
import {
  fetchLocalActivities,
  fetchLocalEvents,
  fetchLocalFTPTests,
  fetchLocalLabels,
  fetchLocalAthlete,
} from '../api/local';
import {useEnv} from './useEnv';

type Fetcher<T> = (...args: any[]) => Promise<T>;

const PROD_REGISTRY: {[key: string]: Fetcher<any>} = {
  'activities.get': fetchActivities,
  'athlete.get': fetchAthlete,
  'events.get': getEvents,
  'events.set': upsertEvent,
  'events.delete': deleteEvent,
  'labels.get': getLabels,
  'labels.set': upsertLabel,
  'labels.delete': deleteLabel,
  'ftp_tests.get': getFTPTests,
  'ftp_tests.set': upsertFTPTest,
};

const DEV_REGISTRY: {[key: string]: Fetcher<any>} = {
  'activities.get': fetchLocalActivities,
  'athlete.get': fetchLocalAthlete,
  'events.get': fetchLocalEvents,
  'events.set': () => Promise.resolve(console.log('Local, not implemented')),
  'events.delete': () => Promise.resolve(console.log('Local, not implemented')),
  'labels.get': fetchLocalLabels,
  'labels.set': () => Promise.resolve(console.log('Local, not implemented')),
  'labels.delete': () => Promise.resolve(console.log('Local, not implemented')),
  'ftp_tests.get': fetchLocalFTPTests,
  'ftp_tests.set': () => Promise.resolve(console.log('Local, not implemented')),
};

const useFetcher = <T>(key: string): Fetcher<T> => {
  const [devMode] = useEnv();
  const registry = devMode ? DEV_REGISTRY : PROD_REGISTRY;

  return registry[key];
};

export {useFetcher};
