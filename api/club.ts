import {readClubCalendar} from './_lib/club-calendar.js';
import {json} from './_lib/http.js';
import {athleteKey} from './_lib/keys.js';
import {redis} from './_lib/redis.js';
import {readSession} from './_lib/session.js';

/** The rider's club calendar, from the club's team on pedalons.fr set as its website. */
export const GET = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const club = await redis().hget<{url?: string} | null>(athleteKey(athleteId, 'settings'), 'club');

  return json(await readClubCalendar(athleteId, club?.url));
};
