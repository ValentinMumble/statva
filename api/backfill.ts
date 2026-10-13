import {json} from './_lib/http.js';
import {readSession} from './_lib/session.js';
import {backfillActivities} from './_lib/sync.js';

/**
 * Fills in the details and power data of a few older activities. The app calls it after a
 * sync without waiting for it, as it takes a while (one Strava read per activity).
 */
export const POST = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  return json(await backfillActivities(athleteId));
};
