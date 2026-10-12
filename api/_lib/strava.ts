import {env} from './env.js';
import {redis} from './redis.js';

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const API = 'https://www.strava.com/api/v3';
const TOKENS_KEY = 'strava_tokens';
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

/** Swaps the code from Strava's consent page for tokens, and stores them for that athlete. */
const exchangeCode = async (code: string): Promise<number> => {
  const tokens = await requestTokens({code, grant_type: 'authorization_code'});

  if (undefined === tokens.athlete) throw new Error('Strava did not say which athlete this is');

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

const stravaGet = async (athleteId: number, path: string, query = new URLSearchParams()): Promise<Response> => {
  const url = `${API}/${path}${0 < [...query].length ? `?${query}` : ''}`;

  return await fetch(url, {headers: {Authorization: `Bearer ${await accessToken(athleteId)}`}});
};

export {exchangeCode, stravaGet};
