import {randomBytes} from 'node:crypto';
import {env} from './_lib/env.js';
import {cookie, json, readCookie, redirect} from './_lib/http.js';
import {clearSessionCookie, readSession, sessionCookie} from './_lib/session.js';
import {deauthorize, exchangeCode, forgetTokens} from './_lib/strava.js';
import {forgetAthlete} from './_lib/sync.js';

/**
 * Logging in with Strava and out again, in one function (the Hobby plan allows 12 per
 * deployment). vercel.json sends /api/auth/<step> here as ?step=<step>, so the URLs Strava
 * and the app know stay as they were.
 */

const AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
// activity:read_all: private activities. profile:read_all: gear and FTP.
// activity:write lets ride rules and renaming change activities on Strava.
const SCOPE = 'read,activity:read_all,activity:write,profile:read_all';
const REQUIRED_SCOPES = ['activity:read_all', 'profile:read_all'];

// The step from the rewrite's query, or from the path when the request comes as it was sent.
const stepOf = (url: URL): string => url.searchParams.get('step') ?? url.pathname.split('/').pop() ?? '';

/** Sends the rider to Strava's consent page. The state cookie proves the answer comes back to the same browser. */
const login = (url: URL): Response => {
  const state = randomBytes(16).toString('base64url');
  const params = new URLSearchParams({
    client_id: env('STRAVA_CLIENT_ID'),
    redirect_uri: `${url.origin}/api/auth/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPE,
    state,
  });

  return redirect(`${AUTHORIZE_URL}?${params}`, {'Set-Cookie': cookie('statva_state', state, 600)});
};

const fail = (reason: string): Response => redirect(`/?login=${reason}`, {'Set-Cookie': cookie('statva_state', '', 0)});

/** Where Strava sends the rider back after the consent page. */
const callback = async (request: Request, url: URL): Promise<Response> => {
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const scopes = (url.searchParams.get('scope') ?? '').split(',');

  if (null === state || state !== readCookie(request, 'statva_state')) return fail('expired');
  if (null === code) return fail('denied');
  if (!REQUIRED_SCOPES.every(scope => scopes.includes(scope))) return fail('scope');

  const athleteId = await exchangeCode(code);

  if (null === athleteId) return fail('not-allowed');

  const headers = new Headers();
  headers.append('Set-Cookie', sessionCookie(athleteId));
  headers.append('Set-Cookie', cookie('statva_state', '', 0));

  return redirect('/', headers);
};

/** Login, Strava's callback, whether someone is logged in (me), and logout. */
export const GET = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);

  switch (stepOf(url)) {
    case 'login':
      return login(url);
    case 'callback':
      return await callback(request, url);
    case 'me': {
      const athleteId = readSession(request);
      return null === athleteId ? json({error: 'Not logged in'}, 401) : json({athleteId});
    }
    case 'logout':
      return redirect('/', {'Set-Cookie': clearSessionCookie()});
    default:
      return json({error: 'Not found'}, 404);
  }
};

/** Disconnect: revokes Statva's access on Strava and deletes everything Statva holds for the rider. */
export const POST = async (request: Request): Promise<Response> => {
  if ('disconnect' !== stepOf(new URL(request.url))) return json({error: 'Not found'}, 404);

  const athleteId = readSession(request);

  if (null !== athleteId) {
    await deauthorize(athleteId).catch(() => undefined);
    await forgetAthlete(athleteId);
    await forgetTokens(athleteId);
  }

  return redirect('/', {'Set-Cookie': clearSessionCookie()});
};
