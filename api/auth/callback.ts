import {allowedAthletes} from '../_lib/env.js';
import {cookie, readCookie, redirect} from '../_lib/http.js';
import {sessionCookie} from '../_lib/session.js';
import {exchangeCode} from '../_lib/strava.js';

const REQUIRED_SCOPES = ['activity:read_all', 'profile:read_all'];

const fail = (reason: string): Response => redirect(`/?login=${reason}`, {'Set-Cookie': cookie('statva_state', '', 0)});

/** Where Strava sends the rider back after the consent page. */
export const GET = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const scopes = (url.searchParams.get('scope') ?? '').split(',');

  if (null === state || state !== readCookie(request, 'statva_state')) return fail('expired');
  if (null === code) return fail('denied');
  if (!REQUIRED_SCOPES.every(scope => scopes.includes(scope))) return fail('scope');

  const athleteId = await exchangeCode(code);

  if (!allowedAthletes().includes(athleteId)) return fail('not-allowed');

  const headers = new Headers();
  headers.append('Set-Cookie', sessionCookie(athleteId));
  headers.append('Set-Cookie', cookie('statva_state', '', 0));

  return redirect('/', headers);
};
