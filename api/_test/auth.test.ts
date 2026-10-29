import {install} from './fakes.js';
import {GET as auth} from '../auth.js';
import {GET as strava} from '../strava.js';

const ORIGIN = 'https://statva.test';
const SCOPE = 'read,activity:read_all,profile:read_all';

const request = (path: string, cookie?: string) =>
  new Request(`${ORIGIN}${path}`, {headers: undefined === cookie ? {} : {cookie}});

const cookiesOf = (response: Response) => response.headers.getSetCookie().map(line => line.split(';')[0]);

/** Goes through the Strava login and returns the session cookie. */
const logIn = async (): Promise<string> => {
  const start = await auth(request('/api/auth/login'));
  const state = new URL(String(start.headers.get('Location'))).searchParams.get('state');
  const response = await auth(request(`/api/auth/callback?state=${state}&code=ok&scope=${SCOPE}`, cookiesOf(start)[0]));

  return String(cookiesOf(response).find(line => line.startsWith('statva_session=')));
};

describe('login', () => {
  it('sends the rider to Strava with a state and our callback', async () => {
    install();
    const location = new URL(String((await auth(request('/api/auth/login'))).headers.get('Location')));

    expect(location.origin + location.pathname).toBe('https://www.strava.com/oauth/authorize');
    expect(location.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/auth/callback`);
    expect(location.searchParams.get('state')).toBeTruthy();
  });

  it('refuses a forged state and missing permissions', async () => {
    install();
    const start = await auth(request('/api/auth/login'));
    const state = new URL(String(start.headers.get('Location'))).searchParams.get('state');
    const stateCookie = cookiesOf(start)[0];

    const forged = await auth(request(`/api/auth/callback?state=forged&code=ok&scope=${SCOPE}`, stateCookie));
    const narrow = await auth(request(`/api/auth/callback?state=${state}&code=ok&scope=read`, stateCookie));

    expect(forged.headers.get('Location')).toBe('/?login=expired');
    expect(narrow.headers.get('Location')).toBe('/?login=scope');
  });

  it('refuses athletes who are not on the list, keeps nothing of theirs and hands their access back', async () => {
    const fake = install();
    process.env.STRAVA_ATHLETE_IDS = '7';

    const start = await auth(request('/api/auth/login'));
    const state = new URL(String(start.headers.get('Location'))).searchParams.get('state');
    const response = await auth(
      request(`/api/auth/callback?state=${state}&code=ok&scope=${SCOPE}`, cookiesOf(start)[0]),
    );

    expect(response.headers.get('Location')).toBe('/?login=not-allowed');
    expect(fake.read('strava_tokens')['42']).toBeUndefined();
    expect(fake.strava.calls).toContain('/oauth/deauthorize');
  });

  it('answers through the rewrite vercel.json makes of /api/auth/<step>', async () => {
    install();

    expect((await auth(request('/api/auth?step=me'))).status).toBe(401);
    expect((await auth(request('/api/auth?step=login'))).headers.get('Location')).toMatch(/^https:\/\/www.strava.com/);
    expect((await auth(request('/api/auth?step=nothing'))).status).toBe(404);
  });

  it('logs in an athlete on the list and stores their tokens', async () => {
    const fake = install();
    const session = await logIn();

    expect(fake.read('strava_tokens')['42']).toBeDefined();
    expect((await auth(request('/api/auth/me', session))).status).toBe(200);
  });

  it('refuses a missing or edited session', async () => {
    install();
    const session = await logIn();

    for (const cookie of [undefined, session.replace('statva_session=42', 'statva_session=43')]) {
      expect((await auth(request('/api/auth/me', cookie))).status).toBe(401);
      expect((await strava(request('/api/strava?path=athlete', cookie))).status).toBe(401);
    }
  });
});

describe('Strava proxy', () => {
  it('passes the app’s own calls with the stored token and only known parameters', async () => {
    const fake = install();
    const session = await logIn();

    const response = await strava(
      request('/api/strava?path=athlete/activities&page=2&per_page=30&access_token=x', session),
    );

    expect(response.status).toBe(200);
    expect(fake.strava.calls.at(-1)).toBe('/api/v3/athlete/activities?page=2&per_page=30');
  });

  it('lets an activity’s photos through, at a given size', async () => {
    const fake = install();
    const session = await logIn();

    await strava(request('/api/strava?path=activities/12/photos&size=1000&photo_sources=true', session));

    expect(fake.strava.calls.at(-1)).toBe('/api/v3/activities/12/photos?size=1000&photo_sources=true');
  });

  it('refuses every other path', async () => {
    install();
    const session = await logIn();

    for (const path of [
      'athletes/99/routes',
      'activities/1/../../athlete',
      'uploads',
      'activities/1?x=1',
      'push_subscriptions',
    ]) {
      expect((await strava(request(`/api/strava?path=${encodeURIComponent(path)}`, session))).status).toBe(403);
    }
  });
});
