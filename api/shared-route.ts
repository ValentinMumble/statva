import {allowedAthletes} from './_lib/env.js';
import {json} from './_lib/http.js';
import {redis} from './_lib/redis.js';
import {stravaGet} from './_lib/strava.js';

/**
 * One route and its check-ins, readable without logging in: this is what a shared
 * `/routes/:id` link shows to the people following a ride. Only the owner's routes.
 */
export const GET = async (request: Request): Promise<Response> => {
  const routeId = new URL(request.url).searchParams.get('id') ?? '';

  if (!/^\d+$/.test(routeId)) return json({error: 'Not found'}, 404);

  const [owner] = allowedAthletes();
  const response = await stravaGet(owner, `routes/${routeId}`);

  if (!response.ok) return json({error: 'Not found'}, 404);

  const route = (await response.json()) as {athlete?: {id: number}};

  if (route.athlete?.id !== owner) return json({error: 'Not found'}, 404);

  const checkIns = (await redis().hget('check_ins', routeId)) ?? [];

  return json({route, checkIns});
};
