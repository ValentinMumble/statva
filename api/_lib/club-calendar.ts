import {athleteKey} from './keys.js';
import {redis} from './redis.js';

/**
 * A club's ride calendar, read from its team on pedalons.fr, whose public API lists the
 * team's publications (rides and posts), newest first, a page at a time. The whole history
 * is a few pages, so it is read again in full now and then and kept in between. Only that
 * site is read, whatever the rider writes in the club's website setting.
 */

type ClubRide = {
  title: string;
  // "N-Peloton" for "N-Peloton #676", or the whole title for a one-off ride.
  series: string;
  number: number | null;
  // The local day of the ride, where it rides.
  day: string;
  groups: number | null;
  finish: string | null;
};

type ClubCalendar = {rides: ClubRide[]; complete: boolean};

// What the site sends for a publication, as far as the calendar reads it.
type Publication = {
  type: string;
  status: string;
  deleted?: boolean;
  name: string;
  dateTime: string;
  timezone?: string;
  groupCount?: number | null;
  endPlace?: {name?: string} | null;
};

const SITE = 'https://www.pedalons.fr';
const HOSTS = ['www.pedalons.fr', 'pedalons.fr'];
const PAGE_SIZE = 200;
// The history is a handful of pages; this only stops a site gone wrong from paging forever.
const MAX_PAGES = 20;
const RECHECK_MS = 6 * 3_600_000;
const USER_AGENT = 'Statva (https://statva.vumble.dev)';

/** The local day of a moment where it happens, as 2026-10-14. */
const localDayOf = (moment: string, timeZone = 'Europe/Paris'): string =>
  new Intl.DateTimeFormat('en-CA', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(
    new Date(moment),
  );

/** The published rides among a page of publications; posts, drafts and deleted rides are left out. */
const ridesOf = (publications: Publication[]): ClubRide[] =>
  publications
    .filter(({type, status, deleted}) => 'RIDE' === type && 'PUBLISHED' === status && true !== deleted)
    .map(({name, dateTime, timezone, groupCount, endPlace}) => {
      const title = name.trim();
      const [, series, number] = title.match(/^(.*?)\s*#(\d+)/) ?? [];

      return {
        title,
        series: undefined === series ? title : series.trim(),
        number: undefined === number ? null : Number(number),
        day: localDayOf(dateTime, timezone),
        groups: groupCount ?? null,
        finish: endPlace?.name?.trim() || null,
      };
    });

/** The team's id on pedalons.fr (https://www.pedalons.fr/equipes/n-peloton), or null. */
const teamSlug = (website: string | undefined): string | null => {
  try {
    const url = new URL(website ?? '');
    const [, slug] = url.pathname.match(/^\/equipes\/([\w-]+)\/?$/) ?? [];

    return 'https:' === url.protocol && HOSTS.includes(url.hostname) && undefined !== slug ? slug : null;
  } catch {
    return null;
  }
};

const readAll = async (slug: string): Promise<ClubRide[]> => {
  const rides: ClubRide[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetch(`${SITE}/api/teams/${slug}/publications?page=${page}&size=${PAGE_SIZE}`, {
      headers: {'User-Agent': USER_AGENT, Accept: 'application/json'},
    });
    if (!response.ok) throw new Error(`Club site ${response.status}`);

    const {publications = [], total = 0} = (await response.json()) as {publications?: Publication[]; total?: number};
    rides.push(...ridesOf(publications));
    if (publications.length < PAGE_SIZE || (page + 1) * PAGE_SIZE >= total) break;
  }

  return rides;
};

/**
 * The club's rides, newest first: read from the site at most every few hours, and kept in
 * between. When the site cannot be read, what is kept is returned as it is.
 */
const readClubCalendar = async (
  athleteId: number,
  website: string | undefined,
  now = Date.now(),
): Promise<ClubCalendar> => {
  const slug = teamSlug(website);
  if (null === slug) return {rides: [], complete: true};

  const key = athleteKey(athleteId, 'club');
  const stored = await redis().hmget<{rides: ClubRide[]; state: {slug: string; checkedAt: number}}>(
    key,
    'rides',
    'state',
  );
  let rides = stored?.rides ?? [];

  if (
    null === stored?.state ||
    undefined === stored?.state ||
    stored.state.slug !== slug ||
    now - stored.state.checkedAt > RECHECK_MS
  ) {
    try {
      rides = (await readAll(slug)).sort((first, second) => second.day.localeCompare(first.day));
      await redis().hset(key, {rides, state: {slug, checkedAt: now}});
    } catch {
      // The site is down or changed: keep what is known, and try again next time.
    }
  }

  return {rides, complete: true};
};

export {readClubCalendar, ridesOf, teamSlug};
export type {ClubCalendar, ClubRide, Publication};
