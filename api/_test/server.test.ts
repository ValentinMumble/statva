import {install, makeActivities} from './fakes.js';
import {canBackfill} from '../_lib/budget.js';
import {webhookVerifyToken} from '../_lib/env.js';
import {syncActivities, refreshActivity} from '../_lib/sync.js';
import {sessionCookie} from '../_lib/session.js';
import {POST as store} from '../store.js';
import {GET as webhookCheck, POST as webhook} from '../webhook.js';

const ORIGIN = 'https://statva.test';

const sessionOf = (athleteId: number): string => sessionCookie(athleteId).split(';')[0];

const storeCall = async (athleteId: number | null, body: unknown) =>
  await store(
    new Request(`${ORIGIN}/api/store`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...(null === athleteId ? {} : {cookie: sessionOf(athleteId)})},
      body: JSON.stringify(body),
    }),
  );

const hook = async (event: unknown) =>
  await webhook(new Request(`${ORIGIN}/api/webhook`, {method: 'POST', body: JSON.stringify(event)}));

describe('sync', () => {
  it('pages through the whole history a few pages per call, then only asks for what is new', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(850);

    const first = await syncActivities(42);
    expect(first).toMatchObject({added: 600, historyDone: false});

    const second = await syncActivities(42);
    expect(second).toMatchObject({added: 250, historyDone: true});
    expect(Object.keys(fake.read('athlete:42:activities'))).toHaveLength(850);

    fake.strava.calls = [];
    fake.strava.activities.unshift({id: 5000, name: 'New ride', start_date: '2030-01-01T08:00:00Z'});
    await syncActivities(42);
    const listCalls = fake.strava.calls.filter(call => call.startsWith('/api/v3/athlete/activities'));
    expect(listCalls).toHaveLength(1);
    expect(listCalls[0]).toContain('after=');
    expect(fake.read('athlete:42:activities')['5000']).toBeDefined();
  });

  it('stores light summaries and cleaned details', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(3);

    await syncActivities(42);
    const summary = fake.read('athlete:42:activities')['1003'] as Record<string, unknown>;
    const detail = fake.read('athlete:42:details')['1003'] as Record<string, unknown>;

    expect(summary.description).toBeUndefined();
    expect(summary.segment_efforts).toBeUndefined();
    expect(summary.map).toEqual({id: 'a1003', summary_polyline: 'abc'});
    expect(detail.description).toBe('notes');
    expect(detail.segment_efforts).toEqual([{kom_rank: 1}]);
    expect(detail.laps).toBeUndefined();
  });

  it('backfills a few details per call, newest first', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(25);

    const report = await syncActivities(42);

    expect(report).toMatchObject({detailsFetched: 10, detailsMissing: 15});
    expect(Object.keys(fake.read('athlete:42:details')).map(Number).sort()).toEqual(
      Array.from({length: 10}, (_, index) => 1016 + index),
    );
  });

  it('stops backfilling when half the shared rate limit is used', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(25);
    fake.strava.usage = {short: 49, daily: 100};

    const report = await syncActivities(42);

    expect(report.detailsFetched).toBe(1);
  });

  it('reports a rate limit instead of failing', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(5);
    fake.strava.rateLimited = true;

    await expect(syncActivities(42)).resolves.toMatchObject({limited: true, added: 0, detailsFetched: 0});
  });
});

describe('refreshing one activity', () => {
  it('removes an activity Strava no longer has', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(2);
    await syncActivities(42);

    fake.strava.activities = fake.strava.activities.filter(({id}) => 1002 !== id);
    await refreshActivity(42, 1002);

    expect(fake.read('athlete:42:activities')['1002']).toBeUndefined();
    expect(fake.read('athlete:42:details')['1002']).toBeUndefined();
    expect(fake.read('athlete:42:activities')['1001']).toBeDefined();
  });
});

describe('normalized power', () => {
  const steady = (watts: number) => ({
    time: {data: Array.from({length: 600}, (_, index) => index)},
    watts: {data: Array(600).fill(watts)},
  });

  it('is worked out from the power data with the details, for a power meter only', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(2).map(activity => ({...activity, device_watts: 1002 === activity.id}));
    fake.strava.streams = {1002: steady(230), 1001: steady(999)};

    await refreshActivity(42, 1002);
    await refreshActivity(42, 1001);

    expect(fake.read('athlete:42:details')['1002']).toMatchObject({normalized_power: 230});
    expect(fake.read('athlete:42:details')['1001']).toMatchObject({normalized_power: null});
    expect(fake.read('athlete:42:power')).toEqual({1002: 230, 1001: 0});
    // No power meter, no streams asked for.
    expect(fake.strava.calls.filter(call => call.includes('/streams'))).toEqual(['/api/v3/activities/1002/streams?keys=time%2Cwatts%2Cmoving%2Ccadence%2Cdistance%2Cheartrate&key_by_type=true']);
  });

  it('leaves the power of a run alone, an Apple Watch\'s say', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(1).map(activity => ({...activity, sport_type: 'Run', device_watts: true}));
    fake.strava.streams = {1001: steady(280)};

    await refreshActivity(42, 1001);

    expect(fake.read('athlete:42:details')['1001']).toMatchObject({normalized_power: null});
    expect(fake.strava.calls.filter(call => call.includes('/streams'))).toEqual([]);
  });

  it('fills in activities stored before it was worked out, a few per sync', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(15).map(activity => ({...activity, device_watts: 0 === activity.id % 2}));
    fake.strava.activities.forEach(({id}) => (fake.strava.streams[id] = steady(200)));
    // Stored the way they were before: details without a normalized power, nothing in power.
    await syncActivities(42);
    await syncActivities(42);
    delete fake.hashes['athlete:42:power'];

    const report = await syncActivities(42);

    expect(report.powerFetched).toBe(7);
    expect(Object.keys(fake.read('athlete:42:power'))).toHaveLength(15);
    expect(fake.read('athlete:42:details')['1014']).toMatchObject({normalized_power: 200});
  });
});

describe('budget', () => {
  const usage = {short: 60, shortLimit: 100, daily: 100, dailyLimit: 1000, at: Date.UTC(2026, 5, 1, 10, 5)};

  it('waits while the 15-minute window is half used', () => {
    expect(canBackfill(usage, Date.UTC(2026, 5, 1, 10, 10))).toBe(false);
  });

  it('starts again in the next quarter hour', () => {
    expect(canBackfill(usage, Date.UTC(2026, 5, 1, 10, 15))).toBe(true);
  });

  it('waits for the next day once half the daily limit is used', () => {
    const daily = {...usage, short: 0, daily: 600};
    expect(canBackfill(daily, Date.UTC(2026, 5, 1, 23, 0))).toBe(false);
    expect(canBackfill(daily, Date.UTC(2026, 5, 2, 0, 1))).toBe(true);
  });
});

describe('store', () => {
  it('keeps each rider to their own keys', async () => {
    const fake = install();

    await storeCall(42, {command: 'hset', name: 'events', field: 'e', value: {type: 'chain'}});
    await storeCall(7, {command: 'hset', name: 'events', field: 'e', value: {type: 'tire'}});

    expect(fake.read('athlete:42:events')).toEqual({e: {type: 'chain'}});
    expect(fake.read('athlete:7:events')).toEqual({e: {type: 'tire'}});
    expect(await (await storeCall(42, {command: 'hgetall', name: 'events'})).json()).toEqual({e: {type: 'chain'}});
  });

  it('reads a few entries in one call', async () => {
    install();
    await storeCall(42, {command: 'hset', name: 'events', field: 'a', value: {type: 'chain'}});
    await storeCall(42, {command: 'hset', name: 'events', field: 'b', value: {type: 'tire'}});

    const response = await storeCall(42, {command: 'hmget', name: 'events', fields: ['a', 'b', 'missing']});

    expect(await response.json()).toEqual({a: {type: 'chain'}, b: {type: 'tire'}, missing: null});
  });

  it('reads the newest activities first, by their growing ids', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(30);
    await syncActivities(42);

    const response = await storeCall(42, {command: 'hlatest', name: 'activities', count: 3});

    expect(Object.keys((await response.json()) as object).map(Number).sort()).toEqual([1028, 1029, 1030]);
  });

  it('lets riders read but not write what the server owns', async () => {
    install();

    expect((await storeCall(42, {command: 'hscan', name: 'activities', cursor: '0'})).status).toBe(200);
    expect((await storeCall(42, {command: 'hset', name: 'activities', field: '1', value: {}})).status).toBe(403);
    expect((await storeCall(42, {command: 'hdel', name: 'details', field: '1'})).status).toBe(403);
  });

  it('never reaches the tokens or anything outside the rider names', async () => {
    install();

    for (const name of ['strava_tokens', '../strava_tokens', 'athlete:7:events', 'strava:usage']) {
      expect((await storeCall(42, {command: 'hgetall', name})).status).toBe(403);
    }
    expect((await storeCall(null, {command: 'hgetall', name: 'events'})).status).toBe(401);
  });
});

describe('webhook', () => {
  it('answers Strava’s challenge only with our token', async () => {
    install();
    const check = (token: string) =>
      webhookCheck(new Request(`${ORIGIN}/api/webhook?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=abc`));

    expect(await check(webhookVerifyToken()).json()).toEqual({'hub.challenge': 'abc'});
    expect(check('wrong').status).toBe(403);
  });

  it('stores a new activity', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(1);

    await hook({object_type: 'activity', object_id: 1001, aspect_type: 'create', owner_id: 42});

    expect(fake.read('athlete:42:details')['1001']).toBeDefined();
  });

  it('does not delete an activity Strava still has, whatever the event says', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(1);
    await syncActivities(42);

    await hook({object_type: 'activity', object_id: 1001, aspect_type: 'delete', owner_id: 42});

    expect(fake.read('athlete:42:activities')['1001']).toBeDefined();
  });

  it('ignores riders who never logged in', async () => {
    const fake = install();
    fake.strava.activities = makeActivities(1);

    await hook({object_type: 'activity', object_id: 1001, aspect_type: 'create', owner_id: 99});

    expect(fake.strava.calls).toEqual([]);
  });

  it('ignores riders taken off the list, even with tokens stored', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(1);
    process.env.STRAVA_ATHLETE_IDS = '7';

    await hook({object_type: 'activity', object_id: 1001, aspect_type: 'create', owner_id: 42});

    expect(fake.strava.calls).toEqual([]);
  });

  it('forgets a rider only once Strava confirms the access is gone', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(1);
    await syncActivities(42);
    const disconnect = {object_type: 'athlete', object_id: 42, aspect_type: 'update', owner_id: 42, updates: {authorized: 'false'}};

    await hook(disconnect);
    expect(fake.read('athlete:42:activities')['1001']).toBeDefined();

    fake.strava.tokens[42] = false;
    await hook(disconnect);
    expect(fake.read('athlete:42:activities')).toEqual({});
    expect(fake.read('strava_tokens')['42']).toBeUndefined();
  });
});
