import {cleanDetail, isStatvaUpload, StravaActivity, summaryOf} from './activities.js';
import {canBackfill, readUsage} from './budget.js';
import {athleteKey} from './keys.js';
import {analysePower, PowerAnalysis, PowerStreams} from './power.js';
import {redis} from './redis.js';
import {RideRule, ruleUpdate, RuledActivity} from './rules.js';
import {stravaGet, stravaPut} from './strava.js';

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
// activities whose normalized power has been worked out (0 for those without power data), and
// club the calendar read from the club's website.
const SERVER_NAMES = ['activities', 'details', 'sync', 'power', 'club'];
const RIDER_NAMES = ['events', 'labels', 'ftp_tests', 'expenses', 'settings'];
// Data from features that are gone, still removed when a rider disconnects.
const RETIRED_NAMES = ['check_ins'];
// Server data the browser never reads: a merge waiting for its parts to be deleted, with its file.
const PRIVATE_NAMES = ['merge'];

type SyncState = {nextPage: number; historyDone: boolean; newestStart: number};
// What a sync brought in, quickly: new activities and their details (detailIds).
type SyncReport = {added: number; historyDone: boolean; detailIds: number[]; limited: boolean};
// What a backfill filled in, slowly: details and power data of older activities.
type BackfillReport = {detailIds: number[]; detailsMissing: number; powerFetched: number; limited: boolean};

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
  const data = Object.fromEntries(
    Object.entries(streams).map(([key, {data: values}]) => [key, values]),
  ) as Partial<PowerStreams>;

  return undefined === data.time || undefined === data.watts
    ? null
    : analysePower(data as PowerStreams, Boolean(detail.trainer));
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
const backfillPower = async (athleteId: number): Promise<{ids: number[]; limited: boolean}> => {
  const pending = await missingPower(athleteId);
  const filled: number[] = [];
  let fetched = 0;

  for (let start = 0; start < pending.length && fetched < POWER_PER_CALL; start += POWER_BATCH) {
    const ids = pending.slice(start, start + POWER_BATCH).map(String);
    const details =
      (await redis().hmget<Record<string, StravaActivity | null>>(athleteKey(athleteId, 'details'), ...ids)) ?? {};
    const withoutPower = ids.filter(id => !details[id]?.device_watts);

    if (0 < withoutPower.length)
      await redis().hset(athleteKey(athleteId, 'power'), Object.fromEntries(withoutPower.map(id => [id, 0])));

    for (const id of ids.filter(id => details[id]?.device_watts)) {
      if (fetched >= POWER_PER_CALL || !canBackfill(await readUsage())) return {ids: filled, limited: false};

      try {
        const detail = details[id] as StravaActivity;
        await storeDetail(athleteId, detail, await powerOf(athleteId, detail));
        filled.push(Number(id));
        fetched++;
      } catch (error) {
        if (!(error instanceof RateLimitedError)) throw error;

        return {ids: filled, limited: true};
      }
    }
  }

  return {ids: filled, limited: false};
};

type ChangeResult = 'changed' | 'denied' | 'ignored';

// Strava may tidy spaces and line breaks; only a text that comes back different was dropped.
const sameText = (sent: unknown, received: unknown): boolean =>
  String(sent ?? '')
    .replace(/\s+/g, ' ')
    .trim() ===
  String(received ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Changes an activity on Strava and in the stored copies, without reading it again.
 * "denied" when Strava refused, which it does without write access (riders who logged in
 * before Statva asked for it). "ignored" when Strava answered but kept a field as it was,
 * as it does for some apps cannot change (the commute flag): the fields it took are stored,
 * not that one.
 */
const changeActivity = async (
  athleteId: number,
  activityId: number,
  update: Record<string, unknown>,
): Promise<ChangeResult> => {
  const response = await stravaPut(athleteId, `activities/${activityId}`, update);
  if (!response.ok) return 'denied';

  // What Strava kept as it was, comparing its answer with what was sent: texts loosely,
  // flags exactly. Only what it took is stored, so Statva never shows what Strava does not have.
  const changed = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  // A text missing from the answer was kept too; a flag only when the answer has it.
  const kept = (key: string): boolean =>
    null !== changed &&
    (['name', 'description', 'private_note'].includes(key)
      ? !sameText(update[key], changed[key])
      : ['commute', 'visibility'].includes(key) && key in changed && update[key] !== changed[key]);
  const taken = Object.fromEntries(Object.entries(update).filter(([key]) => !kept(key)));

  // Strava takes "none" to take the gear off, and stores no gear as null. Only the rider sees
  // an activity whose visibility is only_me: Strava's private flag.
  const storedUpdate = {
    ...taken,
    ...('none' === taken.gear_id ? {gear_id: null} : {}),
    ...('visibility' in taken ? {private: 'only_me' === taken.visibility} : {}),
  };
  if (0 < Object.keys(taken).length) {
    for (const name of ['activities', 'details']) {
      const stored = await redis().hget<StravaActivity>(athleteKey(athleteId, name), String(activityId));
      if (null !== stored)
        await redis().hset(athleteKey(athleteId, name), {[activityId]: {...stored, ...storedUpdate}});
    }
  }

  return Object.keys(taken).length < Object.keys(update).length ? 'ignored' : 'changed';
};

/**
 * Applies the rider's ride rules to an activity that has just landed (the webhook's create
 * event, or a sync bringing it in): names it, flags it as a commute, puts it on the bike.
 * Only then, so a change the rider makes on Strava later is never undone. Without write
 * access (logged in before Statva asked for it), nothing changes. What Statva uploaded (a merge,
 * a copy) is left as the rider set it up.
 */
const applyRideRules = async (athleteId: number, detail: StravaActivity | null): Promise<void> => {
  if (null === detail || isStatvaUpload(detail)) return;

  const rules = (await redis().hget<RideRule[]>(athleteKey(athleteId, 'settings'), 'rideRules')) ?? [];
  const update = ruleUpdate(detail as unknown as RuledActivity, rules);

  if (null === update) return;

  await changeActivity(athleteId, detail.id, update);
};

/**
 * Brings a rider's stored activities up to date, quickly: the first calls page through the
 * whole history, a few pages at a time; after that one call fetches what is new, and the
 * details of the activities that are new. Older details and power data are left to the
 * backfill, so a refresh never waits for them.
 */
const syncActivities = async (athleteId: number): Promise<SyncReport> => {
  const stored = await redis().hgetall<Partial<SyncState>>(athleteKey(athleteId, 'sync'));
  const state: SyncState = {nextPage: 1, historyDone: false, newestStart: 0, ...stored};
  // The client parses replies as JSON, so numeric field names come back as numbers.
  const known = new Set((await redis().hkeys(athleteKey(athleteId, 'activities'))).map(Number));
  const listed: StravaActivity[] = [];
  let limited = false;

  try {
    if (state.historyDone) {
      const recent = await listPage(athleteId, {after: state.newestStart - OVERLAP_SECONDS, per_page: PAGE_SIZE});
      await storeSummaries(athleteId, recent);
      listed.push(...recent);
      state.newestStart = Math.max(state.newestStart, ...recent.map(startOf));
    } else {
      for (let call = 0; call < HISTORY_PAGES_PER_CALL && !state.historyDone; call++) {
        const page = await listPage(athleteId, {page: state.nextPage, per_page: PAGE_SIZE});
        await storeSummaries(athleteId, page);
        listed.push(...page);
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

  // The new activities, newest first, get their details now: they are the ones on screen.
  const added = listed.filter(({id}) => !known.has(id)).sort((first, second) => second.id - first.id);
  const detailIds: number[] = [];

  for (const {id} of added.slice(0, DETAILS_PER_CALL)) {
    if (limited) break;

    try {
      const detail = await refreshActivity(athleteId, id);
      // While the history pages in, nothing is new to the rider: rules are for rides just done.
      if (stored?.historyDone) await applyRideRules(athleteId, detail);
      detailIds.push(id);
    } catch (error) {
      if (!(error instanceof RateLimitedError)) throw error;
      limited = true;
    }
  }

  return {added: added.length, historyDone: state.historyDone, detailIds, limited};
};

/**
 * Fills in what older activities still lack, a few per call, while the shared rate limit
 * has room: their details first, newest first, then their power data.
 */
const backfillActivities = async (athleteId: number): Promise<BackfillReport> => {
  const missing = await missingDetails(athleteId);
  const detailIds: number[] = [];
  let limited = false;

  for (const activityId of missing.slice(0, DETAILS_PER_CALL)) {
    if (limited || !canBackfill(await readUsage())) break;

    try {
      await refreshActivity(athleteId, activityId);
      detailIds.push(activityId);
    } catch (error) {
      if (!(error instanceof RateLimitedError)) throw error;
      limited = true;
    }
  }

  // Normalized power for activities stored before Statva worked it out, with what room is left.
  const power = limited ? {ids: [], limited: false} : await backfillPower(athleteId);

  return {
    detailIds: [...detailIds, ...power.ids],
    detailsMissing: missing.length - detailIds.length,
    powerFetched: power.ids.length,
    limited: limited || power.limited,
  };
};

/** Removes everything Statva holds for a rider, as Strava requires once they disconnect. */
const forgetAthlete = async (athleteId: number): Promise<void> => {
  await redis().del(
    ...[...SERVER_NAMES, ...RIDER_NAMES, ...RETIRED_NAMES, ...PRIVATE_NAMES].map(name => athleteKey(athleteId, name)),
  );
};

export {
  applyRideRules,
  backfillActivities,
  changeActivity,
  forgetAthlete,
  refreshActivity,
  RIDER_NAMES,
  SERVER_NAMES,
  syncActivities,
};
export type {BackfillReport, SyncReport};
