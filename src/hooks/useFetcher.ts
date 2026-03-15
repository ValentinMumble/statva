import {
  deleteEvent,
  deleteLabel,
  fetchActivities,
  fetchActivity,
  fetchAthlete,
  getActivities,
  getEvents,
  getExpenses,
  getFTPTests,
  getLabels,
  upsertActivity,
  upsertEvent,
  upsertExpense,
  upsertFTPTest,
  upsertLabel,
} from '../api';
import {
  fetchLocalActivities,
  fetchLocalEvents,
  fetchLocalFTPTests,
  fetchLocalLabels,
  fetchLocalAthlete,
  fetchLocalMeta,
} from '../api/local';

type Fetcher<T> = (...args: any[]) => Promise<T>;

const isDev = import.meta.env.MODE === 'development';
const noop: Fetcher<any> = () => Promise.resolve(console.log('Local, not implemented'));

const REGISTRY: Record<string, Fetcher<any>> = {
  'activities.get': isDev ? fetchLocalActivities : fetchActivities,
  'activity.get': fetchActivity, //TODO: Implement local version
  'activities.meta.get': isDev ? fetchLocalMeta : getActivities,
  'activities.meta.set': isDev ? noop : upsertActivity,
  'athlete.get': isDev ? fetchLocalAthlete : fetchAthlete,
  'events.get': isDev ? fetchLocalEvents : getEvents,
  'events.set': isDev ? noop : upsertEvent,
  'events.delete': isDev ? noop : deleteEvent,
  'expenses.get': isDev ? () => Promise.resolve([]) : getExpenses,
  'expenses.set': isDev ? noop : upsertExpense,
  'labels.get': isDev ? fetchLocalLabels : getLabels,
  'labels.set': isDev ? noop : upsertLabel,
  'labels.delete': isDev ? noop : deleteLabel,
  'ftp_tests.get': isDev ? fetchLocalFTPTests : getFTPTests,
  'ftp_tests.set': isDev ? noop : upsertFTPTest,
};

const getFetcher = <T>(key: string): Fetcher<T> => REGISTRY[key];

export {getFetcher};
