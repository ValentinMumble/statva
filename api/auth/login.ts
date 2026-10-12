import {randomBytes} from 'node:crypto';
import {env} from '../_lib/env.js';
import {cookie, redirect} from '../_lib/http.js';

const AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
// read_all: private routes. activity:read_all: private activities. profile:read_all: gear and FTP.
const SCOPE = 'read,read_all,activity:read_all,profile:read_all';

/** Sends the rider to Strava's consent page. The state cookie proves the answer comes back to the same browser. */
export const GET = (request: Request): Response => {
  const state = randomBytes(16).toString('base64url');
  const params = new URLSearchParams({
    client_id: env('STRAVA_CLIENT_ID'),
    redirect_uri: `${new URL(request.url).origin}/api/auth/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPE,
    state,
  });

  return redirect(`${AUTHORIZE_URL}?${params}`, {'Set-Cookie': cookie('statva_state', state, 600)});
};
