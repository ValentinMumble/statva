import {recordUsage} from './budget.js';
import {allowedAthletes, env} from './env.js';
import {TOKENS_KEY} from './keys.js';
import {redis} from './redis.js';

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const API = 'https://www.strava.com/api/v3';
const DEAUTHORIZE_ENDPOINT = 'https://www.strava.com/oauth/deauthorize';
// Refresh a little early, so a token does not expire on its way to Strava.
const EXPIRY_MARGIN_SECONDS = 120;

type Tokens = {access_token: string; refresh_token: string; expires_at: number};

const requestTokens = async (body: Record<string, string>): Promise<Tokens & {athlete?: {id: number}}> => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({client_id: env('STRAVA_CLIENT_ID'), client_secret: env('STRAVA_CLIENT_SECRET'), ...body}),
  });

  if (!response.ok) throw new Error(`Strava token request failed: ${response.status}`);

  return (await response.json()) as Tokens & {athlete?: {id: number}};
};

const saveTokens = async (athleteId: number, {access_token, refresh_token, expires_at}: Tokens) => {
  await redis().hset(TOKENS_KEY, {[athleteId]: {access_token, refresh_token, expires_at}});
};

/**
 * Swaps the code from Strava's consent page for tokens, and stores them for that athlete.
 * An athlete who is not on the list gets null: their access is handed straight back to
 * Strava and nothing is stored, so the webhook never brings in their activities and they
 * do not take one of the app's athlete places on Strava.
 */
const exchangeCode = async (code: string): Promise<number | null> => {
  const tokens = await requestTokens({code, grant_type: 'authorization_code'});

  if (undefined === tokens.athlete) throw new Error('Strava did not say which athlete this is');

  if (!allowedAthletes().includes(tokens.athlete.id)) {
    await fetch(DEAUTHORIZE_ENDPOINT, {method: 'POST', headers: {Authorization: `Bearer ${tokens.access_token}`}});

    return null;
  }

  await saveTokens(tokens.athlete.id, tokens);

  return tokens.athlete.id;
};

/** A valid access token for the athlete, refreshed and stored again when it has expired. */
const accessToken = async (athleteId: number): Promise<string> => {
  const tokens = await redis().hget<Tokens>(TOKENS_KEY, String(athleteId));

  if (null === tokens) throw new Error(`No Strava tokens for athlete ${athleteId}`);
  if (tokens.expires_at - EXPIRY_MARGIN_SECONDS > Date.now() / 1000) return tokens.access_token;

  const refreshed = await requestTokens({refresh_token: tokens.refresh_token, grant_type: 'refresh_token'});
  await saveTokens(athleteId, refreshed);

  return refreshed.access_token;
};

/** Changes an activity on Strava (name, commute, gear, mute): needs the activity:write scope. */
const stravaPut = async (athleteId: number, path: string, body: Record<string, unknown>): Promise<Response> =>
  await fetch(`${API}/${path}`, {
    method: 'PUT',
    headers: {Authorization: `Bearer ${await accessToken(athleteId)}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });

const stravaGet = async (athleteId: number, path: string, query = new URLSearchParams()): Promise<Response> => {
  const url = `${API}/${path}${0 < [...query].length ? `?${query}` : ''}`;
  const response = await fetch(url, {headers: {Authorization: `Bearer ${await accessToken(athleteId)}`}});
  await recordUsage(response.headers);

  return response;
};

/** Revokes Statva's access to the athlete on Strava, which invalidates every token it holds. */
const deauthorize = async (athleteId: number): Promise<void> => {
  await fetch(DEAUTHORIZE_ENDPOINT, {
    method: 'POST',
    headers: {Authorization: `Bearer ${await accessToken(athleteId)}`},
  });
};

/** Forgets an athlete's tokens, after they disconnected Statva on Strava's side. */
const forgetTokens = async (athleteId: number): Promise<void> => {
  await redis().hdel(TOKENS_KEY, String(athleteId));
};

/** Whether Statva still has access to the athlete, checked with Strava itself. */
const hasAccess = async (athleteId: number): Promise<boolean> => {
  try {
    return (await stravaGet(athleteId, 'athlete')).ok;
  } catch {
    return false;
  }
};

export {deauthorize, exchangeCode, forgetTokens, hasAccess, stravaGet, stravaPut};
