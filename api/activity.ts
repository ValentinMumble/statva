import {GEAR_ID, json, MAX_NAME} from './_lib/http.js';
import {readSession} from './_lib/session.js';
import {changeActivity, refreshActivity} from './_lib/sync.js';

/** Fetches one activity from Strava again and stores it, for when the stored copy is out of date. */
export const POST = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const activityId = Number(new URL(request.url).searchParams.get('id'));

  if (!Number.isInteger(activityId) || 0 >= activityId) return json({error: 'Not found'}, 404);

  const activity = await refreshActivity(athleteId, activityId);

  return null === activity ? json({error: 'Not found'}, 404) : json(activity);
};

// Notes are free text; this only keeps a request from being huge.
const MAX_NOTE = 10_000;

/** Renames an activity on Strava, moves it to other gear, or changes its description or private note. */
export const PUT = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const activityId = Number(new URL(request.url).searchParams.get('id'));
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    gear_id?: unknown;
    description?: unknown;
    private_note?: unknown;
  } | null;

  if (!Number.isInteger(activityId) || 0 >= activityId) return json({error: 'Not found'}, 404);

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
