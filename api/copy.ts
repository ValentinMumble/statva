import {copyForToday} from './_lib/copy.js';
import {json} from './_lib/http.js';
import {UploadError} from './_lib/merge.js';
import {readSession} from './_lib/session.js';

// Reading the ride, uploading it and waiting for Strava takes longer than the default.
export const maxDuration = 60;

/** Copies a ride to today, at the same time of day, on Strava and in Statva. */
export const POST = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const activityId = Number(new URL(request.url).searchParams.get('id'));

  if (!Number.isInteger(activityId) || 0 >= activityId) return json({error: 'Not found'}, 404);

  try {
    const result = await copyForToday(athleteId, activityId);

    return json(result, 'processing' === result.outcome ? 202 : 200);
  } catch (error) {
    if (error instanceof UploadError) return json({error: error.message}, error.status);
    throw error;
  }
};
