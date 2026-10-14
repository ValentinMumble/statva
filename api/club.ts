import {readClubCalendar} from './_lib/club-calendar.js';
import {json} from './_lib/http.js';
import {athleteKey} from './_lib/keys.js';
import {redis} from './_lib/redis.js';
import {readSession} from './_lib/session.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The rider's club calendar from the club's website, back to since (the first club ride in
 * Statva). The app calls it again while it says it is not complete.
 */
export const GET = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const since = new URL(request.url).searchParams.get('since') ?? '';
  if (!DAY.test(since)) return json({error: 'A since day is needed'}, 400);

  const club = await redis().hget<{url?: string} | null>(athleteKey(athleteId, 'settings'), 'club');
  const today = new Date().toISOString().slice(0, 10);

  return json(await readClubCalendar(athleteId, club?.url, since, today));
};
