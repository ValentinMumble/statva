import {install} from './fakes.js';
import {sessionCookie} from '../_lib/session.js';
import {GET} from '../activity.js';

const call = async (athleteId: number, query = '') =>
  await GET(
    new Request(`https://statva.test/api/activity?action=komoot${query}`, {
      headers: {cookie: sessionCookie(athleteId).split(';')[0]},
    }),
  );

const withKomoot = () => {
  const fake = install();
  process.env.STRAVA_ATHLETE_IDS = '42,43';
  process.env.KOMOOT_EMAIL = 'rider@example.com';
  process.env.KOMOOT_PASSWORD = fake.komoot.password;
  return fake;
};

describe("the owner's Komoot tours", () => {
  afterEach(() => {
    delete process.env.KOMOOT_EMAIL;
    delete process.env.KOMOOT_PASSWORD;
  });

  it('lists the planned tours and reads one, logging in once and keeping the session', async () => {
    const fake = withKomoot();

    expect(await (await call(42)).json()).toEqual([
      {id: 55, name: 'Samedi aller', distance: 118000, elevation_up: 1003, sport: 'racebike', date: '2026-11-01'},
    ]);
    expect(await (await call(42, '&id=55')).json()).toEqual({
      name: 'Samedi aller',
      points: [
        {lat: 47.2, lng: -1.5, alt: 10},
        {lat: 47.3, lng: -1.6, alt: 40},
      ],
    });
    expect(fake.komoot.logins).toBe(1);
    // The session key is kept, never the password.
    expect(JSON.stringify(fake.strings)).not.toContain(fake.komoot.password);
  });

  it('logs in again when the session has run out', async () => {
    const fake = withKomoot();
    await call(42);

    fake.komoot.session++;

    expect((await call(42)).status).toBe(200);
    expect(fake.komoot.logins).toBe(2);
  });

  it('is only for the owner, once the login is set, and says when Komoot refuses it', async () => {
    const fake = withKomoot();

    expect((await call(43)).status).toBe(404);
    fake.komoot.password = 'changed on Komoot';
    expect((await call(42)).status).toBe(502);
    delete process.env.KOMOOT_PASSWORD;
    expect((await call(42)).status).toBe(404);
  });
});
