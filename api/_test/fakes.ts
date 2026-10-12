/**
 * A fake Upstash (its REST protocol: POST a command, or a list of commands for a
 * pipeline) and a fake Strava, behind one fetch, so the server code runs unchanged.
 */
type Hashes = Record<string, Record<string, string>>;

type FakeActivity = {id: number; start_date: string; [field: string]: unknown};

type FakeStrava = {
  activities: FakeActivity[];
  tokens: Record<number, boolean>;
  usage: {short: number; daily: number};
  limits: {short: number; daily: number};
  calls: string[];
  rateLimited: boolean;
};

const ENV = {
  STRAVA_CLIENT_ID: '1',
  STRAVA_CLIENT_SECRET: 'secret',
  STRAVA_ATHLETE_IDS: '42,7',
  SESSION_SECRET: 'session-secret',
  KV_REST_API_URL: 'https://fake.upstash.io',
  KV_REST_API_TOKEN: 'token',
};

const install = () => {
  const hashes: Hashes = {};
  const strings: Record<string, string> = {};
  const strava: FakeStrava = {
    activities: [],
    tokens: {},
    usage: {short: 0, daily: 0},
    limits: {short: 100, daily: 1000},
    calls: [],
    rateLimited: false,
  };

  Object.assign(process.env, ENV);

  const run = ([command, key, ...args]: string[]): unknown => {
    const hash = (hashes[key] ??= {});

    switch (command.toLowerCase()) {
      case 'hset':
        for (let index = 0; index < args.length; index += 2) hash[args[index]] = args[index + 1];
        return args.length / 2;
      case 'hget':
        return hash[args[0]] ?? null;
      case 'hmget':
        return args.map(field => hash[field] ?? null);
      case 'hgetall':
        return Object.entries(hash).flat();
      case 'hkeys':
        return Object.keys(hash);
      case 'hlen':
        return Object.keys(hash).length;
      case 'hdel':
        return args.filter(field => delete hash[field]).length;
      case 'hscan':
        return ['0', Object.entries(hash).flat()];
      case 'set':
        strings[key] = args[0];
        return 'OK';
      case 'get':
        return strings[key] ?? null;
      case 'del':
        return [key, ...args].filter(name => delete hashes[name] || delete strings[name]).length;
      default:
        throw new Error(`Fake Redis does not know ${command}`);
    }
  };

  const stravaResponse = (url: URL, init: RequestInit): Response => {
    const headers = {
      'x-readratelimit-usage': `${strava.usage.short},${strava.usage.daily}`,
      'x-readratelimit-limit': `${strava.limits.short},${strava.limits.daily}`,
    };
    const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers});

    if ('/oauth/token' === url.pathname) {
      const body = JSON.parse(String(init.body));
      return respond({access_token: `access-${body.grant_type}`, refresh_token: 'refresh', expires_at: Date.now() / 1000 + 3600, athlete: {id: 42}});
    }
    if ('/oauth/deauthorize' === url.pathname) {
      strava.calls.push(url.pathname);
      return respond({});
    }

    strava.calls.push(url.pathname + url.search);
    if (strava.rateLimited) return respond({message: 'Rate Limit Exceeded'}, 429);
    strava.usage.short++;
    strava.usage.daily++;

    const athleteId = 42;
    if ('/api/v3/athlete' === url.pathname) return strava.tokens[athleteId] === false ? respond({}, 401) : respond({id: athleteId});

    if ('/api/v3/athlete/activities' === url.pathname) {
      const perPage = Number(url.searchParams.get('per_page') ?? 30);
      const after = url.searchParams.get('after');
      if (null !== after) {
        return respond(strava.activities.filter(({start_date}) => new Date(start_date).getTime() / 1000 > Number(after)).slice(0, perPage));
      }
      const page = Number(url.searchParams.get('page') ?? 1);
      return respond(strava.activities.slice((page - 1) * perPage, page * perPage));
    }

    const detail = url.pathname.match(/^\/api\/v3\/activities\/(\d+)$/);
    if (null !== detail) {
      const activity = strava.activities.find(({id}) => id === Number(detail[1]));
      return undefined === activity ? respond({message: 'Record Not Found'}, 404) : respond(activity);
    }

    return respond({message: 'Unknown'}, 404);
  };

  global.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));

    if ('fake.upstash.io' === url.host) {
      // The client asks for every string in a reply to be base64-encoded, and decodes them.
      const encoded = 'base64' === new Headers(init.headers).get('Upstash-Encoding');
      const encode = (value: unknown): unknown =>
        Array.isArray(value)
          ? value.map(encode)
          : 'string' === typeof value && encoded
            ? Buffer.from(value).toString('base64')
            : value;
      const body = JSON.parse(String(init.body));
      const result = Array.isArray(body[0])
        ? body.map((command: string[]) => ({result: encode(run(command))}))
        : {result: encode(run(body))};
      return new Response(JSON.stringify(result));
    }

    return stravaResponse(url, init);
  }) as typeof fetch;

  /** Stores tokens for an athlete, as a login would. */
  const login = (athleteId: number) => {
    run(['hset', 'strava_tokens', String(athleteId), JSON.stringify({access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() / 1000 + 3600})]);
  };

  const read = (key: string): Record<string, unknown> =>
    Object.fromEntries(Object.entries(hashes[key] ?? {}).map(([field, value]) => [field, JSON.parse(value)]));

  return {hashes, strings, strava, login, read};
};

/** Activities as Strava lists them: newest first, ids growing with time. */
const makeActivities = (count: number): FakeActivity[] =>
  Array.from({length: count}, (_, index) => {
    const id = 1000 + count - index;
    const start = new Date(Date.UTC(2026, 0, 1) + (count - index) * 86400000);

    return {
      id,
      name: `Ride ${id}`,
      start_date: start.toISOString(),
      distance: 30000,
      description: 'notes',
      segment_efforts: [{kom_rank: 1, name: 'heavy'}],
      laps: [{distance: 1}],
      map: {id: `a${id}`, summary_polyline: 'abc', polyline: 'abcdef'},
    };
  });

export {install, makeActivities};
