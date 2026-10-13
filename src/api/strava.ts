import {ActivityZone, Athlete, DetailedActivity} from '../models/strava';

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
const strava = <T>(path: string, params: Record<string, number | string> = {}): Promise<T> => {
  const query = new URLSearchParams({path});
  Object.entries(params).forEach(([key, value]) => query.set(key, String(value)));

  return getJson<T>(`/api/strava?${query}`);
};

const fetchAthlete = (): Promise<Athlete> => strava<Athlete>('athlete');

// detailIds: the activities whose details the call stored, for the app to fetch those alone.
type SyncReport = {added: number; historyDone: boolean; detailIds: number[]; limited: boolean};
type BackfillReport = {detailIds: number[]; detailsMissing: number; powerFetched: number; limited: boolean};

const post = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {method: 'POST'});

  if (401 === response.status) throw new NotLoggedInError('Not logged in');
  if (!response.ok) throw new Error(`${url} ${response.status}`);

  return await response.json();
};

/** Asks the server to bring the stored activities up to date with Strava. */
const syncActivities = (): Promise<SyncReport> => post<SyncReport>('/api/sync');

/** Asks the server to fill in the details and power data of a few older activities. Slow. */
const backfillActivities = (): Promise<BackfillReport> => post<BackfillReport>('/api/backfill');

/** Asks the server to fetch one activity from Strava again and store it. */
const refreshActivity = (id: number): Promise<DetailedActivity> => post<DetailedActivity>(`/api/activity?id=${id}`);

const fetchActivityZones = (id: number): Promise<ActivityZone[]> => strava<ActivityZone[]>(`activities/${id}/zones`);

type ActivityPhoto = {unique_id: string; urls: Record<string, string>; caption?: string};

/** Every photo of an activity (the details only hold the main one), at about 1000 px. */
const fetchActivityPhotos = (id: number): Promise<ActivityPhoto[]> =>
  strava<ActivityPhoto[]>(`activities/${id}/photos`, {size: 1000, photo_sources: 'true'});

export {
  backfillActivities,
  fetchActivityPhotos,
  fetchActivityZones,
  fetchAthlete,
  getJson,
  NotLoggedInError,
  refreshActivity,
  syncActivities,
};
export type {ActivityPhoto, BackfillReport, SyncReport};
