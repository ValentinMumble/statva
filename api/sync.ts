import {json} from './_lib/http.js';
import {readSession} from './_lib/session.js';
import {backfillActivities, syncActivities} from './_lib/sync.js';

/**
 * Brings the logged-in rider's activities up to date, quickly: called on every visit. With
 * ?step=backfill, fills in the details and power data of a few older activities instead: the
 * app calls it after a sync without waiting for it, as it takes a while (one Strava read per
 * activity). One function for both, as the Hobby plan allows 12 per deployment.
 */
export const POST = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  return 'backfill' === new URL(request.url).searchParams.get('step')
    ? json(await backfillActivities(athleteId))
    : json(await syncActivities(athleteId));
};
