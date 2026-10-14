import type {ClubRide} from '../models/club';
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

/** Thrown when Strava refuses a change: the rider logged in before Statva asked for write access. */
class NoWriteAccessError extends Error {}
// Strava answered but kept the text as it was, as it may for a field apps cannot write.
class IgnoredByStravaError extends Error {}

type ActivityNote = 'description' | 'private_note';
// Who sees an activity, as Strava names it.
type Visibility = 'everyone' | 'followers_only' | 'only_me';

/** Changes an activity on Strava (and in Statva). */
type ActivityChange = {name: string} | {gear_id: string} | {commute: boolean} | {visibility: Visibility} | Partial<Record<ActivityNote, string>>;

const changeActivity = async (id: number, change: ActivityChange): Promise<void> => {
  const response = await fetch(`/api/activity?id=${id}`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(change)});

  if (401 === response.status) throw new NotLoggedInError('Not logged in');
  if (403 === response.status) throw new NoWriteAccessError('No write access');
  if (422 === response.status) throw new IgnoredByStravaError('Strava kept it as it was');
  if (!response.ok) throw new Error(`Changing the activity failed: ${response.status}`);
};

const renameActivity = (id: number, name: string): Promise<void> => changeActivity(id, {name});

/** Moves an activity to other gear on Strava, or takes it off with "none". */
const setActivityGear = (id: number, gearId: string): Promise<void> => changeActivity(id, {gear_id: gearId});

/** Flags an activity as a commute on Strava, or not. */
const setActivityCommute = (id: number, commute: boolean): Promise<void> => changeActivity(id, {commute});

/** Changes who sees an activity on Strava. */
const setActivityVisibility = (id: number, visibility: Visibility): Promise<void> => changeActivity(id, {visibility});

/** Changes an activity's description or private note on Strava. */
const setActivityNote = (id: number, note: ActivityNote, text: string): Promise<void> => changeActivity(id, {[note]: text});

/** The club's calendar from its website, back to since; called again while not complete. */
const fetchClubCalendar = (since: string): Promise<{rides: ClubRide[]; complete: boolean}> => getJson(`/api/club?since=${since}`);

/** Asks the server to fetch one activity from Strava again and store it. */
const refreshActivity = (id: number): Promise<DetailedActivity> => post<DetailedActivity>(`/api/activity?id=${id}`);

const fetchActivityZones = (id: number): Promise<ActivityZone[]> => strava<ActivityZone[]>(`activities/${id}/zones`);

type ActivityPhoto = {unique_id: string; urls: Record<string, string>; caption?: string};

/** Every photo of an activity (the details only hold the main one), at about 1000 px. */
const fetchActivityPhotos = (id: number): Promise<ActivityPhoto[]> =>
  strava<ActivityPhoto[]>(`activities/${id}/photos`, {size: 1000, photo_sources: 'true'});

export {
  backfillActivities,
  NoWriteAccessError,
  renameActivity,
  setActivityGear,
  setActivityNote,
  setActivityCommute,
  setActivityVisibility,
  fetchClubCalendar,
  IgnoredByStravaError,
  fetchActivityPhotos,
  fetchActivityZones,
  fetchAthlete,
  getJson,
  NotLoggedInError,
  refreshActivity,
  syncActivities,
};
export type {ActivityNote, ActivityPhoto, BackfillReport, SyncReport, Visibility};
