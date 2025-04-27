import {Redis} from '@upstash/redis';
import {CheckIn, Event, FTPTest, Labels} from '../models';
import {DetailedActivity} from '../models/strava';

enum Key {
  EVENTS = 'events',
  LABELS = 'labels',
  FTP_TESTS = 'ftp_tests',
  ACTIVITIES = 'activities',
  CHECK_INS = 'check_ins',
}

const client = () =>
  new Redis({
    url: import.meta.env.VITE_KV_REST_API_URL,
    token: import.meta.env.VITE_KV_REST_API_TOKEN,
  });

const getEvents = async (): Promise<Event[] | null> => {
  const rawEvents = await client().hgetall<Record<string, Event>>(Key.EVENTS);

  if (null === rawEvents) return null;

  return Object.values(rawEvents)
    .map(event => ({...event, date: new Date(event.date)}))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

const upsertEvent = async (event: Event) => {
  await client().hset(Key.EVENTS, {[event.id]: event});
};

const deleteEvent = async (eventId: string) => {
  await client().hdel(Key.EVENTS, eventId);
};

const getLabels = async (): Promise<Labels> => {
  const labels = await client().hgetall<Labels>(Key.LABELS);
  const collator = new Intl.Collator('en', {numeric: true, sensitivity: 'base'});

  return Object.fromEntries(Object.entries(labels ?? {}).sort(([keyA], [keyB]) => collator.compare(keyA, keyB)));
};

const upsertLabel = async (key: string, label: string) => {
  await client().hset(Key.LABELS, {[key]: label});
};

const deleteLabel = async (key: string) => {
  await client().hdel(Key.LABELS, key);
};

const getFTPTests = async (): Promise<FTPTest[]> => {
  const ftpTests = await client().hgetall<Record<string, FTPTest>>(Key.FTP_TESTS);

  if (null === ftpTests) return [];

  return Object.values(ftpTests)
    .map(ftpTest => ({...ftpTest, date: new Date(ftpTest.date)}))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

const upsertFTPTest = async (test: FTPTest) => {
  await client().hset(Key.FTP_TESTS, {[test.id]: test});
};

const getActivities = async (): Promise<Record<string, DetailedActivity>> => {
  const activities = await client().hgetall<Record<string, DetailedActivity>>(Key.ACTIVITIES);

  return activities ?? {};
};

const upsertActivity = async (activity: DetailedActivity) => {
  await client().hset(Key.ACTIVITIES, {[activity.id]: activity});
};

const getCheckIns = async (): Promise<CheckIn[]> => {
  const rawCheckins = await client().hgetall<Record<string, CheckIn[]>>(Key.CHECK_INS);

  if (null === rawCheckins) return [];

  return Object.values(rawCheckins)
    .flat()
    .map(checkIn => ({...checkIn, date: new Date(checkIn.date)}))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

const addCheckIn = async (checkIn: CheckIn) => {
  const checkIns = (await client().hget<CheckIn[]>(Key.CHECK_INS, checkIn.routeId)) ?? [];
  checkIns.push(checkIn);

  await client().hset(Key.CHECK_INS, {[checkIn.routeId]: checkIns});
};

export {
  addCheckIn,
  deleteEvent,
  deleteLabel,
  getActivities,
  getCheckIns,
  getEvents,
  getFTPTests,
  getLabels,
  upsertActivity,
  upsertEvent,
  upsertFTPTest,
  upsertLabel,
};
