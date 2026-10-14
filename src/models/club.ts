import {isPedalled} from './activity-meta';
import {ClubRules, extractFinish, extractNPGroup, isClubRide} from './activity-npeloton';
import {dayFromNumber, dayNumber, localDay, weekdayOf} from './local-day';
import {Activity, DetailedActivity} from './strava';

/** A club ride, with what its name and notes say about it. */
type ClubSession = {
  activity: Activity;
  // The club's own count, from "N-Peloton #672": how many sessions it has run.
  number: number | null;
  group: string;
  finish: string | null;
};

type ClubTotals = {sessions: number; distance: number; elevation: number; time: number; share: number};

type WeekRun = {length: number; from: string | null; to: string | null};

type ClubWeeks = {
  // Every week (from Monday) since the first session, oldest first.
  weeks: {start: string; session: ClubSession | null}[];
  longest: WeekRun;
  current: WeekRun;
  // Of the last weeks gone by, those without a session.
  missedRecently: number;
};

type GroupStats = {name: string; sessions: number; speed: number; power: number | null; riders: number | null};

type ClubRecord = {key: string; heading: string; session: ClubSession; value: number};

type StartPoint = {point: [number, number]; sessions: number};

const RECENT_WEEKS = 8;
// Starts this close together are the same meeting point.
const SAME_START_M = 300;
const METRES_PER_DEGREE = 111_320;

const average = (values: number[]): number | null => (0 === values.length ? null : values.reduce((sum, value) => sum + value, 0) / values.length);

const metresBetween = ([latitudeA, longitudeA]: number[], [latitudeB, longitudeB]: number[]): number =>
  Math.hypot((latitudeA - latitudeB) * METRES_PER_DEGREE, (longitudeA - longitudeB) * METRES_PER_DEGREE * Math.cos((latitudeA * Math.PI) / 180));

// Strava counts the riders it matched on the same ride; 1 means it found nobody, not a solo ride.
const ridersOf = ({athlete_count}: Activity): number | null => (1 < (athlete_count ?? 1) ? athlete_count : null);

const mondayOf = (day: string): string => dayFromNumber(dayNumber(day) - weekdayOf(day));

/** The club's rides, newest first. Notes come from the details when they have arrived. */
const clubSessions = (activities: Activity[], details: Record<string, DetailedActivity>, club: ClubRules): ClubSession[] =>
  activities
    .filter(({name}) => isClubRide(name, club))
    .sort((first, second) => new Date(second.start_date).getTime() - new Date(first.start_date).getTime())
    .map(activity => {
      const number = activity.name.match(/#(\d+)/)?.[1];

      return {
        activity,
        number: undefined === number ? null : Number(number),
        group: extractNPGroup(activity.name, details[activity.id], club),
        finish: extractFinish(details[activity.id]),
      };
    });

/** Sessions, km, climbing and time, and the share of all riding km done with the club. */
const clubTotals = (sessions: ClubSession[], activities: Activity[]): ClubTotals => {
  const distance = sessions.reduce((sum, {activity}) => sum + activity.distance, 0);
  const ridden = activities.filter(({sport_type}) => isPedalled(sport_type)).reduce((sum, activity) => sum + activity.distance, 0);

  return {
    sessions: sessions.length,
    distance,
    elevation: sessions.reduce((sum, {activity}) => sum + activity.total_elevation_gain, 0),
    time: sessions.reduce((sum, {activity}) => sum + activity.moving_time, 0),
    share: 0 === ridden ? 0 : distance / ridden,
  };
};

/** How many sessions the club ran from the first one ridden to the last, by their numbers. */
const sessionsHeld = (sessions: ClubSession[]): {attended: number; held: number} | null => {
  const numbers = [...new Set(sessions.map(({number}) => number).filter((number): number is number => null !== number))];

  if (0 === numbers.length) return null;

  return {attended: numbers.length, held: Math.max(...numbers) - Math.min(...numbers) + 1};
};

/**
 * Week by week since the first session: which had one, the longest and the current run of
 * weeks in a row. This week does not break the current run until it is over.
 */
const clubWeeks = (sessions: ClubSession[], today: string): ClubWeeks => {
  const empty = {length: 0, from: null, to: null};

  if (0 === sessions.length) return {weeks: [], longest: empty, current: empty, missedRecently: 0};

  const byWeek = new Map<string, ClubSession>();
  // Newest first: the first session of a week to land is its latest.
  for (const session of sessions) {
    const week = mondayOf(localDay(session.activity));
    if (!byWeek.has(week)) byWeek.set(week, session);
  }

  const thisWeek = mondayOf(today);
  const first = mondayOf(localDay(sessions[sessions.length - 1].activity));
  const weeks: ClubWeeks['weeks'] = [];
  for (let number = dayNumber(first); number <= dayNumber(thisWeek); number += 7) {
    const start = dayFromNumber(number);
    weeks.push({start, session: byWeek.get(start) ?? null});
  }

  let longest: WeekRun = empty;
  let run: WeekRun = empty;
  for (const {start, session} of weeks) {
    run = null === session ? empty : {length: run.length + 1, from: run.from ?? start, to: start};
    if (run.length > longest.length) longest = run;
  }

  const past = null === weeks[weeks.length - 1].session ? weeks.slice(0, -1) : weeks;
  const currentLength = [...past].reverse().findIndex(({session}) => null === session);
  const length = -1 === currentLength ? past.length : currentLength;
  const current = 0 === length ? empty : {length, from: past[past.length - length].start, to: past[past.length - 1].start};
  const done = weeks.slice(0, -1);

  return {weeks, longest, current, missedRecently: done.slice(-RECENT_WEEKS).filter(({session}) => null === session).length};
};

/** Each group's sessions, average speed, power (rides with a power meter) and riders, most ridden first. */
const groupStats = (sessions: ClubSession[]): GroupStats[] => {
  const groups = new Map<string, ClubSession[]>();
  for (const session of sessions) groups.set(session.group, [...(groups.get(session.group) ?? []), session]);

  return [...groups.entries()]
    .map(([name, rides]) => ({
      name,
      sessions: rides.length,
      speed: average(rides.map(({activity}) => activity.average_speed)) ?? 0,
      power: average(rides.map(({activity}) => (activity.device_watts ? activity.weighted_average_watts : 0)).filter((watts): watts is number => 0 < (watts ?? 0))),
      riders: average(rides.map(({activity}) => ridersOf(activity)).filter((riders): riders is number => null !== riders)),
    }))
    .sort((first, second) => second.sessions - first.sessions);
};

/** How many rode along, on average, at most, and month by month (0 is January) over the years. */
const groupSize = (sessions: ClubSession[]): {average: number | null; biggest: ClubSession | null; byMonth: (number | null)[]} => {
  const counted = sessions.filter(({activity}) => null !== ridersOf(activity));
  const biggest = counted.reduce<ClubSession | null>((best, session) => (null === best || session.activity.athlete_count > best.activity.athlete_count ? session : best), null);
  const byMonth = [...Array(12).keys()].map(month =>
    average(counted.filter(({activity}) => Number(localDay(activity).slice(5, 7)) - 1 === month).map(({activity}) => activity.athlete_count)),
  );

  return {average: average(counted.map(({activity}) => activity.athlete_count)), biggest, byMonth};
};

const RECORDS: {key: string; heading: string; value: (activity: Activity) => number | null; lowest?: boolean}[] = [
  {key: 'fastest', heading: 'Fastest', value: ({average_speed}) => average_speed},
  {key: 'longest', heading: 'Longest', value: ({distance}) => distance},
  {key: 'hilliest', heading: 'Hilliest', value: ({total_elevation_gain}) => total_elevation_gain},
  {key: 'power', heading: 'Most power', value: ({device_watts, weighted_average_watts}) => (device_watts && weighted_average_watts ? weighted_average_watts : null)},
  {key: 'suffer', heading: 'Hardest', value: ({suffer_score}) => suffer_score ?? null},
  {key: 'kudos', heading: 'Most kudos', value: ({kudos_count}) => (0 < kudos_count ? kudos_count : null)},
  {key: 'coldest', heading: 'Coldest', value: ({average_temp}) => average_temp ?? null, lowest: true},
  {key: 'hottest', heading: 'Hottest', value: ({average_temp}) => average_temp ?? null},
];

/** The best session for each record, skipping a record no session has a value for. */
const clubRecords = (sessions: ClubSession[]): ClubRecord[] =>
  RECORDS.flatMap(({key, heading, value, lowest}) => {
    const best = sessions.reduce<{session: ClubSession; value: number} | null>((found, session) => {
      const candidate = value(session.activity);
      if (null === candidate || undefined === candidate) return found;

      return null === found || (lowest ? candidate < found.value : candidate > found.value) ? {session, value: candidate} : found;
    }, null);

    return null === best ? [] : [{key, heading, ...best}];
  });

/** The places sessions start from, most used first, starts within a few hundred metres counted together. */
const startPoints = (sessions: ClubSession[]): StartPoint[] => {
  const points: StartPoint[] = [];
  for (const {activity} of sessions) {
    if (2 !== activity.start_latlng?.length) continue;
    const near = points.find(({point}) => metresBetween(point, activity.start_latlng) <= SAME_START_M);
    if (undefined === near) points.push({point: [activity.start_latlng[0], activity.start_latlng[1]], sessions: 1});
    else near.sessions++;
  }

  return points.sort((first, second) => second.sessions - first.sessions);
};

export {clubRecords, clubSessions, clubTotals, clubWeeks, groupSize, groupStats, sessionsHeld, startPoints};
export type {ClubRecord, ClubSession, ClubTotals, ClubWeeks, GroupStats, StartPoint};
