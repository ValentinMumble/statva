import {cleanDetail, StravaActivity, summaryOf} from './activities.js';
import {canBackfill, readUsage} from './budget.js';
import {athleteKey} from './keys.js';
import {analysePower, PowerAnalysis, PowerStreams} from './power.js';
import {redis} from './redis.js';
import {stravaGet} from './strava.js';

const PAGE_SIZE = 200;
// Kept small so one call stays well inside a function's time limit.
const HISTORY_PAGES_PER_CALL = 3;
const DETAILS_PER_CALL = 10;
const POWER_PER_CALL = 10;
// Stored details read at once to find which need a normalized power.
const POWER_BATCH = 50;
// Activities uploaded late (a watch synced days later) or edited are caught by looking a month
// back from the newest one known: still a single call, as a month fits in one page.
const OVERLAP_SECONDS = 30 * 86400;

// Everything Statva keeps for a rider. These are only written by the server; power lists the
// activities whose normalized power has been worked out (0 for those without power data).
const SERVER_NAMES = ['activities', 'details', 'sync', 'power'];
const RIDER_NAMES = ['events', 'labels', 'ftp_tests', 'expenses', 'settings'];
// Data from features that are gone, still removed when a rider disconnects.
const RETIRED_NAMES = ['check_ins'];

type SyncState = {nextPage: number; historyDone: boolean; newestStart: number};
type SyncReport = {added: number; historyDone: boolean; detailsFetched: number; detailsMissing: number; powerFetched: number; limited: boolean};

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
 * What the power data of an activity recorded with a power meter says (normalized power,
 * best efforts, time per power band, heart rate drift), from its data streams: one more
 * read. Estimated power is left out, as Sauce does.
 */
const powerOf = async (athleteId: number, detail: StravaActivity): Promise<PowerAnalysis | null> => {
  // Rides only: a run's power (an Apple Watch's, say) is no cycling effort.
  const sport = String(detail.sport_type ?? '');
  const pedalled = sport.includes('Ride') || 'Velomobile' === sport || 'Handcycle' === sport;
  if (!detail.device_watts || !pedalled) return null;

  const query = new URLSearchParams({keys: 'time,watts,moving,cadence,distance,heartrate', key_by_type: 'true'});
  const response = await stravaGet(athleteId, `activities/${detail.id}/streams`, query);

  if (429 === response.status) throw new RateLimitedError('Strava rate limit reached');
  if (!response.ok) return null;

  const streams = (await response.json()) as Record<string, {data: unknown[]}>;
  const data = Object.fromEntries(Object.entries(streams).map(([key, {data: values}]) => [key, values])) as Partial<PowerStreams>;

  return undefined === data.time || undefined === data.watts ? null : analysePower(data as PowerStreams, Boolean(detail.trainer));
};

/** Stores an activity's details with what its power data says, and notes that it has been worked out. */
const storeDetail = async (athleteId: number, detail: StravaActivity, power: PowerAnalysis | null): Promise<void> => {
  const withPower = {
    ...detail,
    normalized_power: power?.normalizedPower ?? null,
    power_curve: power?.curve ?? null,
    power_histogram: power?.histogram ?? null,
    heart_rate_drift: power?.heartRateDrift ?? null,
  };

  await redis().hset(athleteKey(athleteId, 'details'), {[detail.id]: cleanDetail(withPower)});
  await redis().hset(athleteKey(athleteId, 'power'), {[detail.id]: power?.normalizedPower ?? 0});
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
    await redis().hdel(athleteKey(athleteId, 'power'), String(activityId));

    return null;
  }
  if (429 === response.status) throw new RateLimitedError('Strava rate limit reached');
  if (!response.ok) throw new Error(`Strava sent activity ${activityId} with ${response.status}`);

  const detail = (await response.json()) as StravaActivity;
  await redis().hset(athleteKey(athleteId, 'activities'), {[activityId]: summaryOf(detail)});
  await storeDetail(athleteId, detail, await powerOf(athleteId, detail));

  return detail;
};

/** Ids with a summary but no details yet, newest first (Strava ids grow over time). */
const missingDetails = async (athleteId: number): Promise<number[]> => {
  // The client parses replies as JSON, so numeric field names come back as numbers.
  const summaries = new Set((await redis().hkeys(athleteKey(athleteId, 'activities'))).map(Number));
  const details = new Set((await redis().hkeys(athleteKey(athleteId, 'details'))).map(Number));

  return [...summaries].filter(id => !details.has(id)).sort((a, b) => b - a);
};

/** Ids with details but no normalized power worked out yet, newest first. */
const missingPower = async (athleteId: number): Promise<number[]> => {
  const details = (await redis().hkeys(athleteKey(athleteId, 'details'))).map(Number);
  const done = new Set((await redis().hkeys(athleteKey(athleteId, 'power'))).map(Number));

  return details.filter(id => !done.has(id)).sort((first, second) => second - first);
};

/**
 * Works out the normalized power of activities stored before Statva did, a few per call.
 * Those without a power meter are noted at once, without asking Strava anything.
 */
const backfillPower = async (athleteId: number): Promise<{fetched: number; limited: boolean}> => {
  const pending = await missingPower(athleteId);
  let fetched = 0;

  for (let start = 0; start < pending.length && fetched < POWER_PER_CALL; start += POWER_BATCH) {
    const ids = pending.slice(start, start + POWER_BATCH).map(String);
    const details = (await redis().hmget<Record<string, StravaActivity | null>>(athleteKey(athleteId, 'details'), ...ids)) ?? {};
    const withoutPower = ids.filter(id => !details[id]?.device_watts);

    if (0 < withoutPower.length) await redis().hset(athleteKey(athleteId, 'power'), Object.fromEntries(withoutPower.map(id => [id, 0])));

    for (const id of ids.filter(id => details[id]?.device_watts)) {
      if (fetched >= POWER_PER_CALL || !canBackfill(await readUsage())) return {fetched, limited: false};

      try {
        const detail = details[id] as StravaActivity;
        await storeDetail(athleteId, detail, await powerOf(athleteId, detail));
        fetched++;
      } catch (error) {
        if (!(error instanceof RateLimitedError)) throw error;

        return {fetched, limited: true};
      }
    }
  }

  return {fetched, limited: false};
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

  // Normalized power for activities stored before Statva worked it out, with what room is left.
  const power = limited ? {fetched: 0, limited: false} : await backfillPower(athleteId);

  return {
    added,
    historyDone: state.historyDone,
    detailsFetched,
    detailsMissing: missing.length - detailsFetched,
    powerFetched: power.fetched,
    limited: limited || power.limited,
  };
};

/** Removes everything Statva holds for a rider, as Strava requires once they disconnect. */
const forgetAthlete = async (athleteId: number): Promise<void> => {
  await redis().del(...[...SERVER_NAMES, ...RIDER_NAMES, ...RETIRED_NAMES].map(name => athleteKey(athleteId, name)));
};

export {forgetAthlete, refreshActivity, RIDER_NAMES, SERVER_NAMES, syncActivities};
export type {SyncReport};
