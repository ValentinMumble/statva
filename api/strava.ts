import {json} from './_lib/http.js';
import {readSession} from './_lib/session.js';
import {stravaGet} from './_lib/strava.js';

// The only Strava calls the app makes. Anything else is refused.
const ALLOWED_PATHS = [/^athlete$/, /^athlete\/activities$/, /^activities\/\d+$/, /^activities\/\d+\/zones$/];
const ALLOWED_PARAMS = ['page', 'per_page'];

/** Calls Strava for the logged-in athlete. */
export const GET = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const params = new URL(request.url).searchParams;
  const path = params.get('path') ?? '';

  if (!ALLOWED_PATHS.some(pattern => pattern.test(path))) {
    return json({error: 'Not allowed'}, 403);
  }

  const query = new URLSearchParams(
    ALLOWED_PARAMS.filter(name => params.has(name)).map(name => [name, params.get(name) ?? '']),
  );
  const response = await stravaGet(athleteId, path, query);

  return new Response(response.body, {status: response.status, headers: {'Content-Type': 'application/json'}});
};
