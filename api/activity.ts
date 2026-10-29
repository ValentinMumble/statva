import {copyForToday} from './_lib/copy.js';
import {GEAR_ID, json, MAX_NAME} from './_lib/http.js';
import {
  discardMerge,
  MAX_PARTS,
  mergeActivities,
  MergeResult,
  pendingMerge,
  retryMerge,
  UploadError,
} from './_lib/merge.js';
import {readSession} from './_lib/session.js';
import {changeActivity, refreshActivity} from './_lib/sync.js';

/**
 * One activity, and what Statva uploads from activities: a merge (?action=merge) and a copy to
 * today (?action=copy). One function for all, as the Hobby plan allows 12 per deployment.
 */

// Reading up to 10 activities, uploading and waiting for Strava takes longer than the default.
export const maxDuration = 60;

// Notes are free text; this only keeps a request from being huge.
const MAX_NOTE = 10_000;

const activityIdOf = (request: Request): number | null => {
  const activityId = Number(new URL(request.url).searchParams.get('id'));

  return Number.isInteger(activityId) && 0 < activityId ? activityId : null;
};

const actionOf = (request: Request): string | null => new URL(request.url).searchParams.get('action');

const uploadFailure = (error: unknown): Response => {
  if (error instanceof UploadError) return json({error: error.message}, error.status);
  throw error;
};

const mergeAnswer = (result: MergeResult): Response =>
  'refused' === result.outcome ? json(result, 409) : 'processing' === result.outcome ? json(result, 202) : json(result);

/**
 * Merges activities into a new one on Strava ({ids, name, gear_id, commute}), or uploads the
 * waiting merge again ({retry: true}) once its parts are deleted.
 */
const merge = async (request: Request, athleteId: number): Promise<Response> => {
  const body = (await request.json().catch(() => null)) as {
    ids?: unknown;
    name?: unknown;
    gear_id?: unknown;
    commute?: unknown;
    retry?: unknown;
  } | null;

  try {
    if (true === body?.retry) return mergeAnswer(await retryMerge(athleteId));

    const ids = Array.isArray(body?.ids) ? body.ids : [];
    const name = 'string' === typeof body?.name ? body.name.trim() : '';
    if (!ids.every(id => Number.isInteger(id) && 0 < id) || ids.length > MAX_PARTS)
      return json({error: `Merge up to ${MAX_PARTS} activities`}, 400);
    if (0 === name.length || name.length > MAX_NAME) return json({error: 'A name is needed'}, 400);
    if ('string' !== typeof body?.gear_id || !GEAR_ID.test(body.gear_id)) return json({error: 'Unknown gear'}, 400);

    return mergeAnswer(
      await mergeActivities(athleteId, ids as number[], {name, gearId: body.gear_id, commute: true === body.commute}),
    );
  } catch (error) {
    return uploadFailure(error);
  }
};

/** Copies a ride to today, at the same time of day, on Strava and in Statva. */
const copy = async (athleteId: number, activityId: number): Promise<Response> => {
  try {
    const result = await copyForToday(athleteId, activityId);

    return json(result, 'processing' === result.outcome ? 202 : 200);
  } catch (error) {
    return uploadFailure(error);
  }
};

/** The merge Strava refused, waiting for its parts to be deleted, or null (?action=merge). */
export const GET = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);
  if ('merge' !== actionOf(request)) return json({error: 'Not found'}, 404);

  return json({pending: await pendingMerge(athleteId)});
};

/**
 * Fetches one activity from Strava again and stores it, for when the stored copy is out of date;
 * merges activities (?action=merge), or copies one to today (?action=copy).
 */
export const POST = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);
  if ('merge' === actionOf(request)) return await merge(request, athleteId);

  const activityId = activityIdOf(request);

  if (null === activityId) return json({error: 'Not found'}, 404);
  if ('copy' === actionOf(request)) return await copy(athleteId, activityId);

  const activity = await refreshActivity(athleteId, activityId);

  return null === activity ? json({error: 'Not found'}, 404) : json(activity);
};

/** Renames an activity on Strava, moves it to other gear, or changes its description or private note. */
export const PUT = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const activityId = activityIdOf(request);
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    gear_id?: unknown;
    description?: unknown;
    private_note?: unknown;
  } | null;

  if (null === activityId) return json({error: 'Not found'}, 404);

  let update: Record<string, string | boolean>;
  const note = (['description', 'private_note'] as const).find(key => undefined !== body?.[key]);
  if (undefined !== note) {
    const text = body?.[note];
    if ('string' !== typeof text || text.length > MAX_NOTE) return json({error: 'A note is text'}, 400);
    update = {[note]: text.trim()};
  } else if (undefined !== body?.gear_id) {
    if ('string' !== typeof body.gear_id || !GEAR_ID.test(body.gear_id)) return json({error: 'Unknown gear'}, 400);
    update = {gear_id: body.gear_id};
  } else {
    const name = 'string' === typeof body?.name ? body.name.trim() : '';
    if (0 === name.length || name.length > MAX_NAME) return json({error: 'A name is needed'}, 400);
    update = {name};
  }

  const result = await changeActivity(athleteId, activityId, update);
  // Strava refuses without write access: the rider logs in again to grant it.
  if ('denied' === result) return json({error: 'No write access'}, 403);
  if ('ignored' === result) return json({error: 'Strava kept it as it was'}, 422);

  return json(update);
};

/** Forgets the waiting merge and its file (?action=merge). */
export const DELETE = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);
  if ('merge' !== actionOf(request)) return json({error: 'Not found'}, 404);

  await discardMerge(athleteId);

  return json({ok: true});
};
