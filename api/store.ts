import {json} from './_lib/http.js';
import {athleteKey} from './_lib/keys.js';
import {redis} from './_lib/redis.js';
import {readSession} from './_lib/session.js';
import {RIDER_NAMES, SERVER_NAMES} from './_lib/sync.js';

// A function response is capped at 4.5 MB, and the activity data is bigger, so large
// hashes are read a page at a time.
const SCAN_PAGE = 150;

type Command =
  | {command: 'hgetall'; name: string}
  | {command: 'hscan'; name: string; cursor: string}
  | {command: 'hget'; name: string; field: string}
  | {command: 'hset'; name: string; field: string; value: unknown}
  | {command: 'hdel'; name: string; field: string};

const READS = ['hgetall', 'hscan', 'hget'];

/**
 * Reads and writes the logged-in rider's own data. The rider's prefix is added here, so
 * no request can reach another rider's data or the Strava tokens. Activities and their
 * details are read-only: only the server writes them, from Strava.
 */
export const POST = async (request: Request): Promise<Response> => {
  const athleteId = readSession(request);

  if (null === athleteId) return json({error: 'Not logged in'}, 401);

  const body = (await request.json().catch(() => null)) as Command | null;
  const writable = RIDER_NAMES.includes(body?.name ?? '');
  const readable = writable || SERVER_NAMES.includes(body?.name ?? '');

  if (null === body || !readable || (!writable && !READS.includes(body.command))) {
    return json({error: 'Not allowed'}, 403);
  }

  const key = athleteKey(athleteId, body.name);

  switch (body.command) {
    case 'hgetall':
      return json(await redis().hgetall(key));
    case 'hscan': {
      const [cursor, flat] = await redis().hscan(key, String(body.cursor), {count: SCAN_PAGE});
      const entries: Record<string, unknown> = {};
      for (let index = 0; index < flat.length; index += 2) entries[String(flat[index])] = flat[index + 1];

      return json({cursor: String(cursor), entries});
    }
    case 'hget':
      return json(await redis().hget(key, String(body.field)));
    case 'hset':
      return json(await redis().hset(key, {[String(body.field)]: body.value}));
    case 'hdel':
      return json(await redis().hdel(key, String(body.field)));
    default:
      return json({error: 'Unknown command'}, 400);
  }
};
