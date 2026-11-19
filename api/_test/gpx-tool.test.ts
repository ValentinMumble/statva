import {install} from './fakes.js';
import {sessionCookie} from '../_lib/session.js';
import {GET} from '../activity.js';

const ROUTE = 'bb3e35d3-dcef-442e-ad69-93eef3d1c1d7';

const call = async (id: string, loggedIn = true) =>
  await GET(
    new Request(`https://statva.test/api/activity?action=gpx&id=${id}`, {
      headers: loggedIn ? {cookie: sessionCookie('42').split(';')[0]} : {},
    }),
  );

describe("a route of prendslaroue.fr's GPX tool", () => {
  it('reads its track, with its name and heights', async () => {
    install();

    expect(await (await call(ROUTE)).json()).toEqual({
      name: 'NP-MU 3.2',
      points: [
        {lat: 47.229496, lng: -1.572533, alt: 12.5},
        {lat: 47.2293986, lng: -1.5723031, alt: 14},
        {lat: 47.229, lng: -1.572},
      ],
    });
  });

  it('reads only a route of the GPX tool, for a logged-in rider', async () => {
    install();

    expect((await call('../../etc')).status).toBe(502);
    expect((await call('00000000-0000-0000-0000-000000000000')).status).toBe(502);
    expect((await call(ROUTE, false)).status).toBe(401);
  });
});
