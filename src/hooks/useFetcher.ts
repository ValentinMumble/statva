import {
  deleteEvent,
  deleteExpense,
  deleteLabel,
  fetchActivityZones,
  fetchAthlete,
  fetchAthleteRoutes,
  fetchSharedRoute,
  getActivities,
  getActivitySummaries,
  getEvents,
  getExpenses,
  getFTPTests,
  getLabels,
  getSettings,
  refreshActivity,
  setSetting,
  syncActivities,
  upsertEvent,
  upsertExpense,
  upsertFTPTest,
  upsertLabel,
} from '../api';
import {demoBackend} from '../demo/backend';
import {isDemo} from '../demo/mode';

// Heterogeneous registry: each fetcher has its own concrete arg signature and is
// called with concrete args downstream, so the args are intentionally untyped here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fetcher<T> = (...args: any[]) => Promise<T>;

// Every call the app makes for data, by name: the real server, or the demo in memory.
const REAL: Record<string, Fetcher<unknown>> = {
  'activities.get': getActivitySummaries,
  'activities.sync': syncActivities,
  'activity.refresh': refreshActivity,
  'activity.zones': fetchActivityZones,
  'activities.meta.get': getActivities,
  'athlete.get': fetchAthlete,
  'events.get': getEvents,
  'events.set': upsertEvent,
  'events.delete': deleteEvent,
  'expenses.get': getExpenses,
  'expenses.set': upsertExpense,
  'expenses.delete': deleteExpense,
  'labels.get': getLabels,
  'labels.set': upsertLabel,
  'labels.delete': deleteLabel,
  'settings.get': getSettings,
  'settings.set': setSetting,
  'ftp_tests.get': getFTPTests,
  'ftp_tests.set': upsertFTPTest,
  'routes.get': fetchAthleteRoutes,
  'routes.shared': fetchSharedRoute,
};

const DEMO: typeof REAL = {
  'activities.get': demoBackend.getActivities,
  'activities.sync': demoBackend.sync,
  'activity.refresh': demoBackend.refreshActivity,
  'activity.zones': demoBackend.getZones,
  'activities.meta.get': demoBackend.getDetails,
  'athlete.get': demoBackend.getAthlete,
  'events.get': demoBackend.getEvents,
  'events.set': demoBackend.setEvent,
  'events.delete': demoBackend.deleteEvent,
  'expenses.get': demoBackend.getExpenses,
  'expenses.set': demoBackend.setExpense,
  'expenses.delete': demoBackend.deleteExpense,
  'labels.get': demoBackend.getLabels,
  'labels.set': demoBackend.setLabel,
  'labels.delete': demoBackend.deleteLabel,
  'settings.get': demoBackend.getSettings,
  'settings.set': demoBackend.setSetting,
  'ftp_tests.get': demoBackend.getFtpTests,
  'ftp_tests.set': demoBackend.setFtpTest,
  'routes.get': demoBackend.getRoutes,
  'routes.shared': demoBackend.getSharedRoute,
};

const REGISTRY = isDemo() ? DEMO : REAL;

const getFetcher = <T>(key: string): Fetcher<T> => {
  const fetcher = REGISTRY[key];

  if (undefined === fetcher) throw new Error(`No fetcher named ${key}`);

  return fetcher as Fetcher<T>;
};

export {getFetcher};
