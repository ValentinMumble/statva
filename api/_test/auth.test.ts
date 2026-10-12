import {install, makeActivities} from './fakes.js';
import {GET as login} from '../auth/login.js';
import {GET as callback} from '../auth/callback.js';
import {GET as me} from '../auth/me.js';
import {GET as strava} from '../strava.js';
import {GET as sharedRoute} from '../shared-route.js';

const ORIGIN = 'https://statva.test';
const SCOPE = 'read,read_all,activity:read_all,profile:read_all';

const request = (path: string, cookie?: string) =>
  new Request(`${ORIGIN}${path}`, {headers: undefined === cookie ? {} : {cookie}});

const cookiesOf = (response: Response) => response.headers.getSetCookie().map(line => line.split(';')[0]);

/** Goes through the Strava login and returns the session cookie. */
const logIn = async (): Promise<string> => {
  const start = login(request('/api/auth/login'));
  const state = new URL(String(start.headers.get('Location'))).searchParams.get('state');
  const response = await callback(request(`/api/auth/callback?state=${state}&code=ok&scope=${SCOPE}`, cookiesOf(start)[0]));

  return String(cookiesOf(response).find(line => line.startsWith('statva_session=')));
};

describe('login', () => {
  it('sends the rider to Strava with a state and our callback', () => {
    install();
    const location = new URL(String(login(request('/api/auth/login')).headers.get('Location')));

    expect(location.origin + location.pathname).toBe('https://www.strava.com/oauth/authorize');
    expect(location.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/auth/callback`);
    expect(location.searchParams.get('state')).toBeTruthy();
  });

  it('refuses a forged state and missing permissions', async () => {
    install();
    const start = login(request('/api/auth/login'));
    const state = new URL(String(start.headers.get('Location'))).searchParams.get('state');
    const stateCookie = cookiesOf(start)[0];

    const forged = await callback(request(`/api/auth/callback?state=forged&code=ok&scope=${SCOPE}`, stateCookie));
    const narrow = await callback(request(`/api/auth/callback?state=${state}&code=ok&scope=read`, stateCookie));

    expect(forged.headers.get('Location')).toBe('/?login=expired');
    expect(narrow.headers.get('Location')).toBe('/?login=scope');
  });

  it('refuses athletes who are not on the list', async () => {
    install();
    process.env.STRAVA_ATHLETE_IDS = '7';

    const start = login(request('/api/auth/login'));
    const state = new URL(String(start.headers.get('Location'))).searchParams.get('state');
    const response = await callback(request(`/api/auth/callback?state=${state}&code=ok&scope=${SCOPE}`, cookiesOf(start)[0]));

    expect(response.headers.get('Location')).toBe('/?login=not-allowed');
  });

  it('logs in an athlete on the list and stores their tokens', async () => {
    const fake = install();
    const session = await logIn();

    expect(fake.read('strava_tokens')['42']).toBeDefined();
    expect((await me(request('/api/auth/me', session))).status).toBe(200);
  });

  it('refuses a missing or edited session', async () => {
    install();
    const session = await logIn();

    for (const cookie of [undefined, session.replace('statva_session=42', 'statva_session=43')]) {
      expect(me(request('/api/auth/me', cookie)).status).toBe(401);
      expect((await strava(request('/api/strava?path=athlete', cookie))).status).toBe(401);
    }
  });
});

describe('Strava proxy', () => {
  it('passes the app’s own calls with the stored token and only known parameters', async () => {
    const fake = install();
    const session = await logIn();

    const response = await strava(request('/api/strava?path=athlete/activities&page=2&per_page=30&access_token=x', session));

    expect(response.status).toBe(200);
    expect(fake.strava.calls.at(-1)).toBe('/api/v3/athlete/activities?page=2&per_page=30');
  });

  it('refuses every other path', async () => {
    install();
    const session = await logIn();

    for (const path of ['athletes/99/routes', 'activities/1/../../athlete', 'uploads', 'activities/1?x=1', 'push_subscriptions']) {
      expect((await strava(request(`/api/strava?path=${encodeURIComponent(path)}`, session))).status).toBe(403);
    }
  });
});

describe('shared route', () => {
  it('needs no login but only shows numeric ids', async () => {
    const fake = install();
    fake.login(42);
    fake.strava.activities = makeActivities(1);

    expect((await sharedRoute(request('/api/shared-route?id=7/../x'))).status).toBe(404);
    expect(fake.strava.calls).toEqual([]);
  });
});
