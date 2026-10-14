import {json} from './_lib/http.js';
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

// Strava allows names up to 255 characters; anything longer is no name.
const MAX_NAME = 255;

/** Renames an activity on Strava, for the riders who name theirs with an emoji. */
export const PUT = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const activityId = Number(new URL(request.url).searchParams.get('id'));
  const body = (await request.json().catch(() => null)) as {name?: unknown} | null;
  const name = 'string' === typeof body?.name ? body.name.trim() : '';

  if (!Number.isInteger(activityId) || 0 >= activityId) return json({error: 'Not found'}, 404);
  if (0 === name.length || name.length > MAX_NAME) return json({error: 'A name is needed'}, 400);

  // Strava refuses without write access: the rider logs in again to grant it.
  return (await changeActivity(athleteId, activityId, {name})) ? json({name}) : json({error: 'No write access'}, 403);
};
