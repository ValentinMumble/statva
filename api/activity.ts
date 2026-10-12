import {json} from './_lib/http.js';
import {readSession} from './_lib/session.js';
import {refreshActivity} from './_lib/sync.js';

/** Fetches one activity from Strava again and stores it, for when the stored copy is out of date. */
export const POST = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const activityId = Number(new URL(request.url).searchParams.get('id'));

  if (!Number.isInteger(activityId) || 0 >= activityId) return json({error: 'Not found'}, 404);

  const activity = await refreshActivity(athleteId, activityId);

  return null === activity ? json({error: 'Not found'}, 404) : json(activity);
};
