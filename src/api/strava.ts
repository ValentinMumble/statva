import {CheckIn} from '../models';
import {ActivityZone, Athlete, DetailedActivity, Route} from '../models/strava';

/** Thrown when the server says nobody is logged in, so the app can show the login screen. */
class NotLoggedInError extends Error {}

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (401 === response.status) throw new NotLoggedInError('Not logged in');
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`Strava API ${response.status}: ${body.message ?? body.error ?? response.statusText}`);
  }

  return await response.json();
};

// Strava is only ever called through the server, which holds the tokens.
const strava = <T>(path: string, params: Record<string, number> = {}): Promise<T> => {
  const query = new URLSearchParams({path});
  Object.entries(params).forEach(([key, value]) => query.set(key, String(value)));

  return getJson<T>(`/api/strava?${query}`);
};

const fetchAthlete = (): Promise<Athlete> => strava<Athlete>('athlete');

type SyncReport = {added: number; historyDone: boolean; detailsFetched: number; detailsMissing: number; limited: boolean};

const post = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {method: 'POST'});

  if (401 === response.status) throw new NotLoggedInError('Not logged in');
  if (!response.ok) throw new Error(`${url} ${response.status}`);

  return await response.json();
};

/** Asks the server to bring the stored activities up to date with Strava. */
const syncActivities = (): Promise<SyncReport> => post<SyncReport>('/api/sync');

/** Asks the server to fetch one activity from Strava again and store it. */
const refreshActivity = (id: number): Promise<DetailedActivity> => post<DetailedActivity>(`/api/activity?id=${id}`);

const fetchAthleteRoutes = (): Promise<Route[]> => strava<Route[]>('routes');

const fetchActivityZones = (id: number): Promise<ActivityZone[]> => strava<ActivityZone[]>(`activities/${id}/zones`);

/** A shared route and its check-ins, readable without logging in. */
const fetchSharedRoute = (id: string): Promise<{route: Route; checkIns: CheckIn[]}> =>
  getJson(`/api/shared-route?id=${encodeURIComponent(id)}`);

export {
  fetchActivityZones,
  fetchAthlete,
  fetchAthleteRoutes,
  fetchSharedRoute,
  getJson,
  NotLoggedInError,
  refreshActivity,
  syncActivities,
};
export type {SyncReport};
