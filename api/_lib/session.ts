import {createHmac, timingSafeEqual} from 'node:crypto';
import {env} from './env.js';
import {cookie, readCookie} from './http.js';

const SESSION_COOKIE = 'statva_session';
const SESSION_DAYS = 30;

const sign = (payload: string): string =>
  createHmac('sha256', env('SESSION_SECRET')).update(payload).digest('base64url');

/** A cookie that says which athlete this is, signed so it cannot be forged or edited. */
const sessionCookie = (athleteId: number): string => {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const payload = `${athleteId}.${expiresAt}`;

  return cookie(SESSION_COOKIE, `${payload}.${sign(payload)}`, SESSION_DAYS * 86400);
};

const clearSessionCookie = (): string => cookie(SESSION_COOKIE, '', 0);

/** The athlete id of a valid, unexpired session, or null. */
const readSession = (request: Request): number | null => {
  const [athleteId, expiresAt, signature] = (readCookie(request, SESSION_COOKIE) ?? '').split('.');

  if (undefined === signature) return null;

  const expected = Buffer.from(sign(`${athleteId}.${expiresAt}`));
  const given = Buffer.from(signature);

  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(expiresAt) < Date.now() / 1000) return null;

  return Number(athleteId);
};

export {clearSessionCookie, readSession, sessionCookie};
