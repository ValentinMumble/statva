import {install} from './fakes.js';
import {sessionCookie} from '../_lib/session.js';
import {DELETE as remove, GET as read, POST as save} from '../activity.js';

const ORIGIN = 'https://statva.test';

const call = async (
  handler: (request: Request) => Promise<Response>,
  method: string,
  query: string,
  body?: unknown,
  loggedIn = true,
) =>
  await handler(
    new Request(`${ORIGIN}/api/activity?${query}`, {
      method,
      headers: {'Content-Type': 'application/json', ...(loggedIn ? {cookie: sessionCookie(42).split(';')[0]} : {})},
      ...(undefined === body ? {} : {body: JSON.stringify(body)}),
    }),
  );

const ride = {
  name: 'Samedi aller',
  points: [
    [47.2, -1.5, 10, 0],
    [47.21, -1.51, 30, 1300],
  ],
  start: Date.parse('2026-11-08T12:00:00Z'),
  pace: {secondsPerMetre: 0.12, secondsPerMetreClimbed: 2.7},
  stops: 1800,
  source: {service: 'komoot', url: 'https://www.komoot.com/tour/3377870893'},
};

describe('sharing a planned ride by link', () => {
  it('keeps it under a short id, for anyone with the link to read without a login', async () => {
    install().login(42);

    const saved = await call(save, 'POST', 'action=share', ride);
    const {id} = (await saved.json()) as {id: string};

    expect(saved.status).toBe(200);
    expect(id).toMatch(/^[A-Za-z0-9_-]{8}$/);

    const opened = await call(read, 'GET', `action=share&id=${id}`, undefined, false);
    expect(opened.status).toBe(200);
    expect(await opened.json()).toEqual(ride);
  });

  it('needs a login to share, and a route that is only a route', async () => {
    install().login(42);

    expect((await call(save, 'POST', 'action=share', ride, false)).status).toBe(401);
    expect((await call(save, 'POST', 'action=share', {...ride, points: [[47.2, -1.5]]})).status).toBe(400);
    expect((await call(save, 'POST', 'action=share', {...ride, points: [...ride.points, ['x', 1, 2, 3]]})).status).toBe(
      400,
    );
    expect((await call(save, 'POST', 'action=share', {...ride, name: ' '})).status).toBe(400);
    expect((await call(save, 'POST', 'action=share', {...ride, pace: {secondsPerMetre: 0}})).status).toBe(400);
    expect((await call(save, 'POST', 'action=share', {...ride, stops: -60})).status).toBe(400);
    // A source is a route's own page, never another address or a private share token.
    for (const url of ['https://evil.example/tour/1', 'https://www.komoot.com/tour/1?share_token=secret']) {
      expect((await call(save, 'POST', 'action=share', {...ride, source: {service: 'komoot', url}})).status).toBe(400);
    }
  });

  it('says when a link leads nowhere', async () => {
    install();

    expect((await call(read, 'GET', 'action=share&id=nothing1', undefined, false)).status).toBe(404);
    expect((await call(read, 'GET', 'action=share&id=../../x', undefined, false)).status).toBe(404);
  });
});

describe('bookmarking shared rides', () => {
  const DAY = 86400000;
  const soon = {...ride, start: Date.now() + 2 * DAY};

  it("keeps the rider's own shares, and others they bookmark, soonest first", async () => {
    install().login(42);

    const own = (await (await call(save, 'POST', 'action=share', soon)).json()) as {id: string};
    const sooner = (await (
      await call(save, 'POST', 'action=share', {...soon, name: 'Lundi', start: Date.now() + DAY})
    ).json()) as {id: string};
    await call(remove, 'DELETE', `action=bookmark&id=${sooner.id}`);
    expect((await call(save, 'POST', `action=bookmark&id=${sooner.id}`)).status).toBe(200);

    const listed = (await (await call(read, 'GET', 'action=bookmark')).json()) as {
      id: string;
      name: string;
      distance: number;
    }[];
    expect(listed.map(({id}) => id)).toEqual([sooner.id, own.id]);
    expect(listed[1]).toMatchObject({name: 'Samedi aller', distance: 1300, source: ride.source});
  });

  it('forgets a bookmark on request, and when its link leads nowhere', async () => {
    install().login(42);

    const {id} = (await (await call(save, 'POST', 'action=share', soon)).json()) as {id: string};
    await call(remove, 'DELETE', `action=bookmark&id=${id}`);

    expect(await (await call(read, 'GET', 'action=bookmark')).json()).toEqual([]);
    expect((await call(save, 'POST', 'action=bookmark&id=nothing1')).status).toBe(404);
    expect((await call(read, 'GET', 'action=bookmark', undefined, false)).status).toBe(401);
  });

  it('drops a ride a day after its start', async () => {
    install().login(42);

    await call(save, 'POST', 'action=share', {...soon, start: Date.now() - 2 * DAY});

    expect(await (await call(read, 'GET', 'action=bookmark')).json()).toEqual([]);
  });
});
