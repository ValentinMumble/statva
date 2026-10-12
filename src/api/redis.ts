import {BikeExpense, CheckIn, Event, FTPTest, Labels} from '../models';
import {NotLoggedInError} from './strava';
import {DetailedActivity} from '../models/strava';

enum Key {
  EVENTS = 'events',
  LABELS = 'labels',
  FTP_TESTS = 'ftp_tests',
  ACTIVITIES = 'activities',
  CHECK_INS = 'check_ins',
  EXPENSES = 'expenses',
}

const send = async <T>(body: Record<string, unknown>): Promise<T> => {
  const response = await fetch('/api/store', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });

  if (401 === response.status) throw new NotLoggedInError('Not logged in');
  if (!response.ok) throw new Error(`Store ${response.status}`);

  return await response.json();
};

// The same few hash commands as the Upstash client, run by the server, which holds the token.
const client = () => ({
  hgetall: <T>(key: Key) => send<T | null>({command: 'hgetall', key}),
  // The whole hash, a page at a time, for hashes too big for one response.
  hscanAll: async <T>(key: Key): Promise<Record<string, T>> => {
    const all: Record<string, T> = {};
    let cursor = '0';

    do {
      const page = await send<{cursor: string; entries: Record<string, T>}>({command: 'hscan', key, cursor});
      Object.assign(all, page.entries);
      cursor = page.cursor;
    } while ('0' !== cursor);

    return all;
  },
  hget: <T>(key: Key, field: string) => send<T | null>({command: 'hget', key, field}),
  hset: async (key: Key, entries: Record<string, unknown>) => {
    await Promise.all(Object.entries(entries).map(([field, value]) => send({command: 'hset', key, field, value})));
  },
  hdel: (key: Key, field: string) => send({command: 'hdel', key, field}),
});

const getEvents = async (): Promise<Event[] | null> => {
  const rawEvents = await client().hgetall<Record<string, Event>>(Key.EVENTS);

  if (null === rawEvents) return null;

  return Object.values(rawEvents).map(event => ({...event, date: new Date(event.date)}));
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
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

const upsertFTPTest = async (test: FTPTest) => {
  await client().hset(Key.FTP_TESTS, {[test.id]: test});
};

const getActivities = async (): Promise<Record<string, DetailedActivity>> => {
  return await client().hscanAll<DetailedActivity>(Key.ACTIVITIES);
};

const upsertActivity = async (activity: DetailedActivity) => {
  await client().hset(Key.ACTIVITIES, {[activity.id]: activity});
};

const addCheckIn = async (checkIn: CheckIn) => {
  const checkIns = (await client().hget<CheckIn[]>(Key.CHECK_INS, checkIn.routeId)) ?? [];
  checkIns.push(checkIn);

  await client().hset(Key.CHECK_INS, {[checkIn.routeId]: checkIns});
};

const getExpenses = async (): Promise<BikeExpense[]> => {
  const rawExpenses = await client().hgetall<Record<string, BikeExpense>>(Key.EXPENSES);

  if (null === rawExpenses) return [];

  return Object.values(rawExpenses)
    .map(expense => ({...expense, date: new Date(expense.date)}))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};

const upsertExpense = async (expense: BikeExpense) => {
  await client().hset(Key.EXPENSES, {[expense.id]: expense});
};

const deleteExpense = async (expenseId: string) => {
  await client().hdel(Key.EXPENSES, expenseId);
};

export {
  addCheckIn,
  deleteEvent,
  deleteExpense,
  deleteLabel,
  getActivities,
  getEvents,
  getExpenses,
  getFTPTests,
  getLabels,
  upsertActivity,
  upsertEvent,
  upsertExpense,
  upsertFTPTest,
  upsertLabel,
};
