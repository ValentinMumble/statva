import {GEAR_ID, json, MAX_NAME} from './_lib/http.js';
import {
  discardMerge,
  MAX_PARTS,
  mergeActivities,
  UploadError,
  MergeResult,
  pendingMerge,
  retryMerge,
} from './_lib/merge.js';
import {readSession} from './_lib/session.js';

// Reading up to 10 activities, uploading and waiting for Strava takes longer than the default.
export const maxDuration = 60;

const answer = (result: MergeResult): Response =>
  'refused' === result.outcome ? json(result, 409) : 'processing' === result.outcome ? json(result, 202) : json(result);

const failure = (error: unknown): Response => {
  if (error instanceof UploadError) return json({error: error.message}, error.status);
  throw error;
};

/** The merge Strava refused, waiting for its parts to be deleted, or null. */
export const GET = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  return json({pending: await pendingMerge(athleteId)});
};

/**
 * Merges activities into a new one on Strava ({ids, name, gear_id, commute}), or uploads the
 * waiting merge again ({retry: true}) once its parts are deleted.
 */
export const POST = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const body = (await request.json().catch(() => null)) as {
    ids?: unknown;
    name?: unknown;
    gear_id?: unknown;
    commute?: unknown;
    retry?: unknown;
  } | null;

  try {
    if (true === body?.retry) return answer(await retryMerge(athleteId));

    const ids = Array.isArray(body?.ids) ? body.ids : [];
    const name = 'string' === typeof body?.name ? body.name.trim() : '';
    if (!ids.every(id => Number.isInteger(id) && 0 < id) || ids.length > MAX_PARTS)
      return json({error: `Merge up to ${MAX_PARTS} activities`}, 400);
    if (0 === name.length || name.length > MAX_NAME) return json({error: 'A name is needed'}, 400);
    if ('string' !== typeof body?.gear_id || !GEAR_ID.test(body.gear_id)) return json({error: 'Unknown gear'}, 400);

    return answer(
      await mergeActivities(athleteId, ids as number[], {
        name,
        gearId: body.gear_id,
        commute: true === body.commute,
      }),
    );
  } catch (error) {
    return failure(error);
  }
};

/** Forgets the waiting merge and its file. */
export const DELETE = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  await discardMerge(athleteId);

  return json({ok: true});
};
