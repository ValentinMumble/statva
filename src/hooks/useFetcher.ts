import {
  backfillActivities,
  renameActivity,
  setActivityGear,
  setActivityNote,
  setActivityVisibility,
  fetchClubCalendar,
  deleteEvent,
  deleteExpense,
  deleteLabel,
  fetchActivityComments,
  fetchActivityPhotos,
  fetchActivityZones,
  fetchAthlete,
  getActivities,
  getActivitySummaries,
  getEvents,
  getExpenses,
  getFTPTests,
  getLabels,
  getLatestDetails,
  getLatestSummaries,
  getSettings,
  getSomeDetails,
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
  'activities.backfill': backfillActivities,
  'activity.refresh': refreshActivity,
  'activity.rename': renameActivity,
  'activity.gear': setActivityGear,
  'activity.note': setActivityNote,
  'activity.visibility': setActivityVisibility,
  'club.calendar': fetchClubCalendar,
  'activity.zones': fetchActivityZones,
  'activity.photos': fetchActivityPhotos,
  'activity.comments': fetchActivityComments,
  'activities.meta.get': getActivities,
  'activities.details.some': getSomeDetails,
  'activities.latest': getLatestSummaries,
  'activities.meta.latest': getLatestDetails,
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
};

const DEMO: typeof REAL = {
  'activities.get': demoBackend.getActivities,
  'activities.sync': demoBackend.sync,
  'activities.backfill': demoBackend.backfill,
  'activity.refresh': demoBackend.refreshActivity,
  'activity.rename': demoBackend.renameActivity,
  'activity.gear': demoBackend.setActivityGear,
  'activity.note': demoBackend.setActivityNote,
  'activity.visibility': demoBackend.setActivityVisibility,
  'club.calendar': demoBackend.getClubCalendar,
  'activity.zones': demoBackend.getZones,
  // The demo has no photos.
  'activity.photos': () => Promise.resolve([]),
  'activity.comments': demoBackend.getComments,
  'activities.meta.get': demoBackend.getDetails,
  'activities.details.some': demoBackend.getSomeDetails,
  'activities.latest': demoBackend.getLatestSummaries,
  'activities.meta.latest': demoBackend.getLatestDetails,
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
};

const REGISTRY = isDemo() ? DEMO : REAL;

const getFetcher = <T>(key: string): Fetcher<T> => {
  const fetcher = REGISTRY[key];

  if (undefined === fetcher) throw new Error(`No fetcher named ${key}`);

  return fetcher as Fetcher<T>;
};

export {getFetcher};
