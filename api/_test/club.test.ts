import {readClubCalendar, ridesOf, teamSlug} from '../_lib/club-calendar.js';
import {sessionCookie} from '../_lib/session.js';
import {GET as clubCalendar} from '../club.js';
import {install} from './fakes.js';

const WEBSITE = 'https://www.pedalons.fr/equipes/n-peloton';
const HOUR_MS = 3_600_000;

// A ride as pedalons.fr lists it: a Wednesday evening, in Paris time.
const ride = (name: string, dateTime: string, fields: Record<string, unknown> = {}) => ({
  type: 'RIDE',
  status: 'PUBLISHED',
  deleted: false,
  name,
  dateTime,
  timezone: 'Europe/Paris',
  groupCount: 8,
  endPlace: {name: 'Zazou'},
  ...fields,
});

// N weekly sessions, newest first, as the site pages them.
const weekly = (count: number) =>
  [...Array(count).keys()].map(index => ride(`N-Peloton #${600 + index}`, new Date(Date.UTC(2026, 0, 7, 17, 30) + index * 7 * 24 * HOUR_MS).toISOString())).reverse();

describe('ridesOf', () => {
  it('keeps published rides, with their local day, groups and finish place', () => {
    expect(
      ridesOf([
        // 23:30 UTC on 14 October is already the 15th in Paris.
        ride('N-Peloton #676', '2026-10-14T23:30:00Z', {groupCount: 10, endPlace: {name: ' A la Boca '}}),
        ride('24h vélo', '2025-11-28T18:30:00Z', {groupCount: 1, endPlace: null}),
        {...ride('Alleyphant #8 - Merci', '2021-09-12T21:00:00Z'), type: 'POST'},
        ride('N-Peloton #500', '2023-01-04T18:30:00Z', {status: 'DRAFT'}),
        ride('N-Peloton #499', '2022-12-28T18:30:00Z', {deleted: true}),
      ]),
    ).toEqual([
      {title: 'N-Peloton #676', series: 'N-Peloton', number: 676, day: '2026-10-15', groups: 10, finish: 'A la Boca'},
      {title: '24h vélo', series: '24h vélo', number: null, day: '2025-11-28', groups: 1, finish: null},
    ]);
  });
});

describe('teamSlug', () => {
  it('only reads team pages on pedalons.fr', () => {
    expect(teamSlug('https://www.pedalons.fr/equipes/n-peloton/')).toBe('n-peloton');
    expect(teamSlug('https://pedalons.fr/equipes/n-peloton')).toBe('n-peloton');
    expect(teamSlug('https://www.prendslaroue.fr/n-peloton')).toBeNull();
    expect(teamSlug('https://example.com/equipes/n-peloton')).toBeNull();
    expect(teamSlug('http://www.pedalons.fr/equipes/n-peloton')).toBeNull();
    expect(teamSlug('https://www.pedalons.fr/equipes/n-peloton/sorties/x')).toBeNull();
    expect(teamSlug(undefined)).toBeNull();
  });
});

describe('readClubCalendar', () => {
  it('reads every page of the history at once, newest first', async () => {
    const fake = install();
    fake.site.publications = weekly(450);

    const calendar = await readClubCalendar(42, WEBSITE);

    expect(fake.site.requests).toEqual([0, 1, 2].map(page => `/api/teams/n-peloton/publications?page=${page}&size=200`));
    expect(calendar.complete).toBe(true);
    expect(calendar.rides).toHaveLength(450);
    expect(calendar.rides[0]).toMatchObject({number: 1049, groups: 8, finish: 'Zazou'});
  });

  it('answers from what it kept for a few hours, then reads the site again', async () => {
    const fake = install();
    fake.site.publications = weekly(3);
    const now = Date.UTC(2026, 0, 25);
    await readClubCalendar(42, WEBSITE, now);

    fake.site.publications = weekly(4);
    fake.site.requests = [];
    expect((await readClubCalendar(42, WEBSITE, now + HOUR_MS)).rides).toHaveLength(3);
    expect(fake.site.requests).toHaveLength(0);

    expect((await readClubCalendar(42, WEBSITE, now + 7 * HOUR_MS)).rides).toHaveLength(4);
    expect(fake.site.requests).toHaveLength(1);
  });

  it('keeps what it has when the site is down, and reads nothing without a team page', async () => {
    const fake = install();
    fake.site.publications = weekly(2);
    await readClubCalendar(42, WEBSITE);

    fake.site.down = true;
    expect((await readClubCalendar(42, WEBSITE, Date.now() + 24 * HOUR_MS)).rides).toHaveLength(2);
    expect(await readClubCalendar(42, 'https://example.com/equipes/club')).toEqual({rides: [], complete: true});
  });
});

describe('the club route', () => {
  const call = async (athleteId: number | null = 42) =>
    await clubCalendar(new Request('https://statva.test/api/club', {headers: null === athleteId ? {} : {cookie: sessionCookie(athleteId).split(';')[0]}}));

  it('reads the calendar of the club website in the settings', async () => {
    const fake = install();
    fake.site.publications = weekly(2);
    await fake.run(['hset', 'athlete:42:settings', 'club', JSON.stringify({name: 'N-Peloton', markers: {}, url: WEBSITE})]);

    const response = await call();
    expect(response.status).toBe(200);
    expect(((await response.json()) as {rides: unknown[]}).rides).toHaveLength(2);
  });

  it('needs a login', async () => {
    install();

    expect((await call(null)).status).toBe(401);
  });
});
