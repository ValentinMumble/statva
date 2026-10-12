import {json} from './_lib/http.js';
import {redis} from './_lib/redis.js';
import {readSession} from './_lib/session.js';

// A function response is capped at 4.5 MB, and the activity cache is bigger, so
// large hashes are read a page at a time.
const SCAN_PAGE = 150;

// The hashes the app keeps. The Strava tokens live in Redis too, and must never be reachable from here.
const KEYS = ['activities', 'events', 'labels', 'ftp_tests', 'check_ins', 'expenses'];

type Command =
  | {command: 'hgetall'; key: string}
  | {command: 'hscan'; key: string; cursor: string}
  | {command: 'hget'; key: string; field: string}
  | {command: 'hset'; key: string; field: string; value: unknown}
  | {command: 'hdel'; key: string; field: string};

/** Reads and writes the app's own data for the logged-in athlete. */
export const POST = async (request: Request): Promise<Response> => {
  if (null === readSession(request)) return json({error: 'Not logged in'}, 401);

  const body = (await request.json().catch(() => null)) as Command | null;

  if (null === body || !KEYS.includes(body.key)) return json({error: 'Not allowed'}, 403);

  switch (body.command) {
    case 'hgetall':
      return json(await redis().hgetall(body.key));
    case 'hscan': {
      const [cursor, flat] = await redis().hscan(body.key, String(body.cursor), {count: SCAN_PAGE});
      const entries: Record<string, unknown> = {};
      for (let index = 0; index < flat.length; index += 2) entries[String(flat[index])] = flat[index + 1];

      return json({cursor: String(cursor), entries});
    }
    case 'hget':
      return json(await redis().hget(body.key, String(body.field)));
    case 'hset':
      return json(await redis().hset(body.key, {[String(body.field)]: body.value}));
    case 'hdel':
      return json(await redis().hdel(body.key, String(body.field)));
    default:
      return json({error: 'Unknown command'}, 400);
  }
};
