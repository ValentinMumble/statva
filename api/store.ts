import {json} from './_lib/http.js';
import {athleteKey} from './_lib/keys.js';
import {redis} from './_lib/redis.js';
import {readSession} from './_lib/session.js';
import {RIDER_NAMES, SERVER_NAMES} from './_lib/sync.js';

// A function response is capped at 4.5 MB, and the activity data is bigger, so large
// hashes are read a page at a time, the pages all at once. Page sizes follow the largest
// entries: summaries stay under 3.5 KB (450 is under 1.6 MB), details are mostly under
// 10 KB (150 is about 1.5 MB).
const PAGE_SIZES: Record<string, number> = {activities: 450, details: 150};
const PAGE_SIZE = 150;

type Command =
  | {command: 'hgetall'; name: string}
  | {command: 'hpage'; name: string; page: number}
  | {command: 'hget'; name: string; field: string}
  | {command: 'hmget'; name: string; fields: string[]}
  | {command: 'hlatest'; name: string; count: number}
  | {command: 'hset'; name: string; field: string; value: unknown}
  | {command: 'hdel'; name: string; field: string};

const READS = ['hgetall', 'hpage', 'hget', 'hmget', 'hlatest'];
// A few entries at a time, like the details of the activities on the home page.
const MAX_FIELDS = 50;

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
    case 'hpage': {
      // Newest first, like hlatest, with the page count so the first answer tells how many
      // more to ask for, all at once.
      const size = PAGE_SIZES[body.name] ?? PAGE_SIZE;
      const page = Math.max(0, Math.floor(Number(body.page)) || 0);
      const fields = (await redis().hkeys(key)).map(String).sort((a, b) => Number(b) - Number(a));
      const slice = fields.slice(page * size, (page + 1) * size);

      return json({
        pages: Math.ceil(fields.length / size),
        entries: 0 === slice.length ? {} : ((await redis().hmget(key, ...slice)) ?? {}),
      });
    }
    case 'hget':
      return json(await redis().hget(key, String(body.field)));
    case 'hlatest': {
      // Strava ids grow over time, so the highest ones are the newest activities: a screen
      // can show those at once, before the whole hash has arrived.
      const count = Math.min(Math.max(1, Math.floor(Number(body.count)) || 20), MAX_FIELDS);
      const fields = (await redis().hkeys(key))
        .map(String)
        .sort((a, b) => Number(b) - Number(a))
        .slice(0, count);

      return json(0 === fields.length ? {} : ((await redis().hmget(key, ...fields)) ?? {}));
    }
    case 'hmget': {
      const fields = (Array.isArray(body.fields) ? body.fields : []).slice(0, MAX_FIELDS).map(String);

      return json(0 === fields.length ? {} : ((await redis().hmget(key, ...fields)) ?? {}));
    }
    case 'hset':
      return json(await redis().hset(key, {[String(body.field)]: body.value}));
    case 'hdel':
      return json(await redis().hdel(key, String(body.field)));
    default:
      return json({error: 'Unknown command'}, 400);
  }
};
