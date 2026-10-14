import {athleteKey} from './keys.js';
import {redis} from './redis.js';

/**
 * A club's ride calendar, read from its page on prendslaroue.fr (the site has no API).
 * The page lists at most 10 rides, newest first, between two dates, so the history is
 * read backwards a few pages per call and kept, then topped up now and then. Only that
 * site is read, whatever the rider writes in the club's website setting.
 */

type ClubRide = {
  title: string;
  // "N-Peloton" for "N-Peloton #676", or the whole title for a one-off ride.
  series: string;
  number: number | null;
  // The local day of the ride, as the page writes it.
  day: string;
  groups: number | null;
  finish: string | null;
};

type CalendarState = {
  // Where the next page back starts (its last day), or null once the history is in.
  cursor: string | null;
  // How far back the history goes: the rider's first club ride.
  since: string;
  // The last day the newest rides were read up to, and when.
  newestDay: string;
  checkedAt: number;
};

type ClubCalendar = {rides: ClubRide[]; complete: boolean};

const HOSTS = ['www.prendslaroue.fr', 'prendslaroue.fr'];
const PAGE_SIZE = 10;
// Few enough that a call stays quick, and polite to the site.
const PAGES_PER_CALL = 6;
const RECHECK_MS = 6 * 3_600_000;
// The newest rides are read again a little before the last check, for late changes.
const RECHECK_OVERLAP_DAYS = 14;
const DAY_MS = 86_400_000;
const USER_AGENT = 'Statva (https://statva.vumble.dev)';
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const shiftDay = (day: string, days: number): string => new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const decode = (html: string): string =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/** "14 octobre 2026" as 2026-10-14, or null. */
const frenchDay = (text: string): string | null => {
  const [, day, month, year] = text.trim().toLowerCase().match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/) ?? [];
  const index = MONTHS.indexOf(month ?? '');

  return -1 === index ? null : `${year}-${String(index + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/** The rides on one page of a team's feed; announcements and anything unreadable are left out. */
const parseRides = (html: string): ClubRide[] =>
  html
    .split('<div class="col-12">')
    .slice(1)
    .flatMap(card => {
      const title = card.match(/\/rides\/[^"]*">([^<]*)</)?.[1];
      const day = frenchDay(card.match(/<h5 class="card-title">([^<]*)</)?.[1] ?? '');

      if (undefined === title || null === day) return [];

      const name = decode(title);
      const [, series, number] = name.match(/^(.*?)\s*#(\d+)/) ?? [];
      const items = [...card.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(([, item]) => decode(item));
      const groups = items.map(item => item.match(/^(\d+)\s+groupes?$/i)?.[1]).find(Boolean);
      const finish = items.map(item => item.match(/^Arrivée\s*:\s*(.+)$/i)?.[1]).find(Boolean);

      return [
        {
          title: name,
          series: undefined === series ? name : series.trim(),
          number: undefined === number ? null : Number(number),
          day,
          groups: undefined === groups ? null : Number(groups),
          finish: finish ?? null,
        },
      ];
    });

/** The team page, when the club's website is one on prendslaroue.fr. */
const teamPage = (website: string | undefined): string | null => {
  try {
    const url = new URL(website ?? '');

    return 'https:' === url.protocol && HOSTS.includes(url.hostname) && /^\/[\w-]+\/?$/.test(url.pathname)
      ? `https://www.prendslaroue.fr${url.pathname.replace(/\/$/, '')}`
      : null;
  } catch {
    return null;
  }
};

const readPage = async (page: string, from: string, to: string): Promise<ClubRide[]> => {
  const response = await fetch(`${page}?from=${from}&to=${to}`, {headers: {'User-Agent': USER_AGENT}});
  if (!response.ok) throw new Error(`Club page ${response.status}`);

  return parseRides(await response.text());
};

const rideKey = ({day, title}: ClubRide): string => `${day} ${title}`;

/**
 * The club's rides from since to today, newest first, read a few pages further on each call:
 * complete once the history back to since is in. When the site cannot be read, what is kept
 * is returned as it is.
 */
const readClubCalendar = async (athleteId: number, website: string | undefined, since: string, today: string, now = Date.now()): Promise<ClubCalendar> => {
  const page = teamPage(website);
  if (null === page) return {rides: [], complete: true};

  const key = athleteKey(athleteId, 'club');
  const stored = await redis().hmget<{rides: ClubRide[]; state: CalendarState}>(key, 'rides', 'state');
  const rides = new Map((stored?.rides ?? []).map(ride => [rideKey(ride), ride]));
  let state: CalendarState = stored?.state ?? {cursor: today, since, newestDay: today, checkedAt: now};
  // An earlier first ride (more history in Statva) reaches further back.
  if (since < state.since) state = {...state, since, cursor: state.cursor ?? shiftDay([...rides.values()].reduce((oldest, {day}) => (day < oldest ? day : oldest), today), -1)};

  let budget = PAGES_PER_CALL;
  const add = (found: ClubRide[]) => found.forEach(ride => rides.set(rideKey(ride), ride));

  try {
    if (null === state.cursor && now - state.checkedAt > RECHECK_MS) {
      const from = shiftDay(state.newestDay, -RECHECK_OVERLAP_DAYS);
      let to = today;
      while (0 < budget--) {
        const found = await readPage(page, from, to);
        add(found);
        if (found.length < PAGE_SIZE) break;
        to = shiftDay(found[found.length - 1].day, -1);
      }
      state = {...state, newestDay: today, checkedAt: now};
    }

    while (null !== state.cursor && 0 < budget--) {
      const found = await readPage(page, state.since, state.cursor);
      add(found);
      // A full page may have more before it; the next one ends the day before its oldest ride.
      state = {...state, cursor: found.length < PAGE_SIZE ? null : shiftDay(found[found.length - 1].day, -1)};
    }
  } catch {
    // The site is down or changed: keep what is known, and try again next time.
  }

  const sorted = [...rides.values()].sort((first, second) => second.day.localeCompare(first.day));
  await redis().hset(key, {rides: sorted, state});

  return {rides: sorted, complete: null === state.cursor};
};

export {parseRides, readClubCalendar, teamPage};
export type {ClubCalendar, ClubRide};
