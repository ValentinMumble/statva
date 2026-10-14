import {parseRides, readClubCalendar, teamPage} from '../_lib/club-calendar.js';
import {sessionCookie} from '../_lib/session.js';
import {GET as clubCalendar} from '../club.js';
import {install} from './fakes.js';

const WEBSITE = 'https://www.prendslaroue.fr/club';
const DAY_MS = 86_400_000;

// Wednesday sessions, one a week from 2026-01-07, and Sunday rides in between.
const weekly = (count: number) =>
  [...Array(count).keys()].map(index => {
    const day = new Date(Date.UTC(2026, 0, 7) + index * 7 * DAY_MS).toISOString().slice(0, 10);
    return [
      {title: `N-Peloton #${600 + index}`, day, groups: 8, finish: 0 === index % 2 ? 'Zazou' : undefined},
      {title: `Raymond Ride #${300 + index}`, day: new Date(Date.parse(day) + 4 * DAY_MS).toISOString().slice(0, 10), groups: 3},
    ];
  }).flat();

describe('parseRides', () => {
  it('reads each ride card, and leaves announcements out', () => {
    const html = `<div class="col-12"><div class="card"><a class="link-dark" href="https://www.prendslaroue.fr/club/rides/N-Peloton_676">N-Peloton #676</a>
      <h5 class="card-title">14 octobre 2026</h5><ul><li >10 groupes</li><li>Départ de 19:30 à 20:30 - Fonderies</li><li>Arrivée : A la Boca</li></ul></div></div>
      <div class="col-12"><div class="card"><a class="link-dark" href="https://www.prendslaroue.fr/club/rides/24h_velo">24h vélo</a>
      <h5 class="card-title">28 novembre 2025</h5><ul><li >1 groupe</li></ul></div></div>
      <div class="col-12"><div class="card"><a class="link-dark" href="https://www.prendslaroue.fr/club/publications/abc">Annulation du ride</a></div></div>`;

    expect(parseRides(html)).toEqual([
      {title: 'N-Peloton #676', series: 'N-Peloton', number: 676, day: '2026-10-14', groups: 10, finish: 'A la Boca'},
      {title: '24h vélo', series: '24h vélo', number: null, day: '2025-11-28', groups: 1, finish: null},
    ]);
  });
});

describe('teamPage', () => {
  it('only reads team pages on prendslaroue.fr', () => {
    expect(teamPage('https://www.prendslaroue.fr/n-peloton/')).toBe('https://www.prendslaroue.fr/n-peloton');
    expect(teamPage('https://prendslaroue.fr/n-peloton')).toBe('https://www.prendslaroue.fr/n-peloton');
    expect(teamPage('https://example.com/n-peloton')).toBeNull();
    expect(teamPage('http://www.prendslaroue.fr/n-peloton')).toBeNull();
    expect(teamPage('https://www.prendslaroue.fr/n-peloton/admin')).toBeNull();
    expect(teamPage(undefined)).toBeNull();
  });
});

describe('readClubCalendar', () => {
  it('reads the history back a few pages per call until it is complete', async () => {
    const fake = install();
    fake.site.rides = weekly(40);

    const first = await readClubCalendar(42, WEBSITE, '2026-01-01', '2026-10-14');
    expect(first.complete).toBe(false);
    expect(fake.site.requests).toHaveLength(6);

    const second = await readClubCalendar(42, WEBSITE, '2026-01-01', '2026-10-14');
    expect(second.complete).toBe(true);
    expect(second.rides).toHaveLength(80);
    expect(second.rides[0]).toMatchObject({series: 'Raymond Ride', number: 339});
    expect(second.rides.find(({number}) => 600 === number)).toMatchObject({day: '2026-01-07', groups: 8, finish: 'Zazou'});
  });

  it('tops up the newest rides once the history is in, a few hours apart', async () => {
    const fake = install();
    fake.site.rides = weekly(3);
    const now = Date.UTC(2026, 0, 25);
    await readClubCalendar(42, WEBSITE, '2026-01-01', '2026-01-25', now);

    fake.site.rides = weekly(4);
    fake.site.requests = [];
    const soon = await readClubCalendar(42, WEBSITE, '2026-01-01', '2026-01-29', now + 3_600_000);
    expect(fake.site.requests).toHaveLength(0);
    expect(soon.rides).toHaveLength(6);

    const later = await readClubCalendar(42, WEBSITE, '2026-01-01', '2026-01-29', now + 7 * 3_600_000);
    expect(fake.site.requests).toEqual(['2026-01-11..2026-01-29']);
    expect(later.rides.map(({title}) => title)).toContain('N-Peloton #603');
  });

  it('keeps what it has when the site is down, and reads nothing without a team page', async () => {
    const fake = install();
    fake.site.rides = weekly(2);
    await readClubCalendar(42, WEBSITE, '2026-01-01', '2026-01-20');

    fake.site.down = true;
    expect((await readClubCalendar(42, WEBSITE, '2026-01-01', '2026-01-20', Date.now() + 86_400_000)).rides).toHaveLength(4);
    expect(await readClubCalendar(42, 'https://example.com/club', '2026-01-01', '2026-01-20')).toEqual({rides: [], complete: true});
  });
});

describe('the club route', () => {
  const call = async (query: string, athleteId: number | null = 42) =>
    await clubCalendar(new Request(`https://statva.test/api/club${query}`, {headers: null === athleteId ? {} : {cookie: sessionCookie(athleteId).split(';')[0]}}));

  it('reads the calendar of the club website in the settings', async () => {
    const fake = install();
    fake.site.rides = weekly(2);
    await fake.run(['hset', 'athlete:42:settings', 'club', JSON.stringify({name: 'N-Peloton', markers: {}, url: WEBSITE})]);

    const response = await call('?since=2026-01-01');
    expect(response.status).toBe(200);
    expect(((await response.json()) as {rides: unknown[]}).rides).toHaveLength(4);
  });

  it('needs a login and a since day', async () => {
    install();

    expect((await call('?since=2026-01-01', null)).status).toBe(401);
    expect((await call('?since=yesterday')).status).toBe(400);
  });
});
