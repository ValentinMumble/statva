import {cleanDetail, StravaActivity, summaryOf} from './activities.js';
import {canBackfill, readUsage} from './budget.js';
import {athleteKey} from './keys.js';
import {redis} from './redis.js';
import {stravaGet} from './strava.js';

const PAGE_SIZE = 200;
// Kept small so one call stays well inside a function's time limit.
const HISTORY_PAGES_PER_CALL = 3;
const DETAILS_PER_CALL = 10;
// Activities uploaded late or edited after the newest one known are caught by looking a day back.
const OVERLAP_SECONDS = 86400;

// Everything Statva keeps for a rider. Activities, details and sync are only written by the server.
const SERVER_NAMES = ['activities', 'details', 'sync'];
const RIDER_NAMES = ['events', 'labels', 'ftp_tests', 'check_ins', 'expenses', 'settings'];

type SyncState = {nextPage: number; historyDone: boolean; newestStart: number};
type SyncReport = {added: number; historyDone: boolean; detailsFetched: number; detailsMissing: number; limited: boolean};

class RateLimitedError extends Error {}

const startOf = ({start_date}: StravaActivity): number => Math.floor(new Date(start_date).getTime() / 1000);

const listPage = async (athleteId: number, params: Record<string, number>): Promise<StravaActivity[]> => {
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]));
  const response = await stravaGet(athleteId, 'athlete/activities', query);

  if (429 === response.status) throw new RateLimitedError('Strava rate limit reached');
  if (!response.ok) throw new Error(`Strava listed activities with ${response.status}`);

  return (await response.json()) as StravaActivity[];
};

const storeSummaries = async (athleteId: number, activities: StravaActivity[]): Promise<void> => {
  if (0 === activities.length) return;

  await redis().hset(
    athleteKey(athleteId, 'activities'),
    Object.fromEntries(activities.map(activity => [activity.id, activity])),
  );
};

/**
 * Fetches one activity's details and stores them with its summary. An activity Strava no
 * longer has is removed, which also makes a forged webhook harmless: nothing is deleted
 * unless Strava itself says the activity is gone.
 */
const refreshActivity = async (athleteId: number, activityId: number): Promise<StravaActivity | null> => {
  const response = await stravaGet(athleteId, `activities/${activityId}`);

  if (404 === response.status) {
    await redis().hdel(athleteKey(athleteId, 'activities'), String(activityId));
    await redis().hdel(athleteKey(athleteId, 'details'), String(activityId));

    return null;
  }
  if (429 === response.status) throw new RateLimitedError('Strava rate limit reached');
  if (!response.ok) throw new Error(`Strava sent activity ${activityId} with ${response.status}`);

  const detail = (await response.json()) as StravaActivity;
  await redis().hset(athleteKey(athleteId, 'activities'), {[activityId]: summaryOf(detail)});
  await redis().hset(athleteKey(athleteId, 'details'), {[activityId]: cleanDetail(detail)});

  return detail;
};

/** Ids with a summary but no details yet, newest first (Strava ids grow over time). */
const missingDetails = async (athleteId: number): Promise<number[]> => {
  // The client parses replies as JSON, so numeric field names come back as numbers.
  const summaries = new Set((await redis().hkeys(athleteKey(athleteId, 'activities'))).map(Number));
  const details = new Set((await redis().hkeys(athleteKey(athleteId, 'details'))).map(Number));

  return [...summaries].filter(id => !details.has(id)).sort((a, b) => b - a);
};

/**
 * Brings a rider's stored activities up to date. The first calls page through the whole
 * history, a few pages at a time; after that one call fetches what is new. Each call then
 * backfills a few activity details, while the shared rate limit has room.
 */
const syncActivities = async (athleteId: number): Promise<SyncReport> => {
  const stored = await redis().hgetall<Partial<SyncState>>(athleteKey(athleteId, 'sync'));
  const state: SyncState = {nextPage: 1, historyDone: false, newestStart: 0, ...stored};
  let added = 0;
  let limited = false;

  try {
    if (state.historyDone) {
      const recent = await listPage(athleteId, {after: state.newestStart - OVERLAP_SECONDS, per_page: PAGE_SIZE});
      await storeSummaries(athleteId, recent);
      added += recent.length;
      state.newestStart = Math.max(state.newestStart, ...recent.map(startOf));
    } else {
      for (let call = 0; call < HISTORY_PAGES_PER_CALL && !state.historyDone; call++) {
        const page = await listPage(athleteId, {page: state.nextPage, per_page: PAGE_SIZE});
        await storeSummaries(athleteId, page);
        added += page.length;
        state.newestStart = Math.max(state.newestStart, ...page.map(startOf));

        if (page.length < PAGE_SIZE) state.historyDone = true;
        else state.nextPage++;
      }
    }
  } catch (error) {
    if (!(error instanceof RateLimitedError)) throw error;
    limited = true;
  }

  await redis().hset(athleteKey(athleteId, 'sync'), state);

  const missing = await missingDetails(athleteId);
  let detailsFetched = 0;

  for (const activityId of missing.slice(0, DETAILS_PER_CALL)) {
    if (limited || !canBackfill(await readUsage())) break;

    try {
      await refreshActivity(athleteId, activityId);
      detailsFetched++;
    } catch (error) {
      if (!(error instanceof RateLimitedError)) throw error;
      limited = true;
    }
  }

  return {added, historyDone: state.historyDone, detailsFetched, detailsMissing: missing.length - detailsFetched, limited};
};

/** Removes everything Statva holds for a rider, as Strava requires once they disconnect. */
const forgetAthlete = async (athleteId: number): Promise<void> => {
  await redis().del(...[...SERVER_NAMES, ...RIDER_NAMES].map(name => athleteKey(athleteId, name)));
};

export {forgetAthlete, refreshActivity, RIDER_NAMES, SERVER_NAMES, syncActivities};
export type {SyncReport};
