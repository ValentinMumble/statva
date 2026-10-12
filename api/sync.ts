import {json} from './_lib/http.js';
import {readSession} from './_lib/session.js';
import {syncActivities} from './_lib/sync.js';

/** Brings the logged-in rider's activities up to date. Called on every visit. */
export const POST = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  return json(await syncActivities(athleteId));
};
