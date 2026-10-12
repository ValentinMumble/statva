import {allowedAthletes, webhookVerifyToken} from './_lib/env.js';
import {json} from './_lib/http.js';
import {TOKENS_KEY} from './_lib/keys.js';
import {redis} from './_lib/redis.js';
import {forgetTokens, hasAccess} from './_lib/strava.js';
import {forgetAthlete, refreshActivity} from './_lib/sync.js';

type StravaEvent = {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  owner_id: number;
  updates?: Record<string, string>;
};

/** Strava checks the subscription by asking us to echo a challenge, with the token we gave it. */
export const GET = (request: Request): Response => {
  const params = new URL(request.url).searchParams;

  if ('subscribe' !== params.get('hub.mode') || webhookVerifyToken() !== params.get('hub.verify_token')) {
    return json({error: 'Not allowed'}, 403);
  }

  return json({'hub.challenge': params.get('hub.challenge')});
};

/**
 * Strava tells us when an activity is created, changed or deleted, and when a rider
 * disconnects. Strava does not sign these calls, so nothing here trusts the event:
 * activities are fetched again from Strava, and a disconnect is checked with Strava
 * before any data is removed.
 */
export const POST = async (request: Request): Promise<Response> => {
  const event = (await request.json().catch(() => null)) as StravaEvent | null;

  // Only riders on the list who logged in have tokens; anything else is not ours.
  if (null === event || !allowedAthletes().includes(event.owner_id) || null === (await redis().hget(TOKENS_KEY, String(event.owner_id)))) {
    return json({ok: true});
  }

  if ('activity' === event.object_type) {
    await refreshActivity(event.owner_id, event.object_id);
  }

  if ('athlete' === event.object_type && 'false' === event.updates?.authorized && !(await hasAccess(event.owner_id))) {
    await forgetAthlete(event.owner_id);
    await forgetTokens(event.owner_id);
  }

  return json({ok: true});
};
