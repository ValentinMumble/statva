import {BikeExpense, Event, FTPTest, Labels, Settings} from '../models';
import {NotLoggedInError} from './strava';
import {Activity, DetailedActivity} from '../models/strava';

enum Key {
  EVENTS = 'events',
  LABELS = 'labels',
  FTP_TESTS = 'ftp_tests',
  // Light summaries, for the list, and full details, for everything else. Both are
  // written by the server only, from Strava.
  ACTIVITIES = 'activities',
  DETAILS = 'details',
  EXPENSES = 'expenses',
  SETTINGS = 'settings',
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

// The same few hash commands as the Upstash client, run by the server on the logged-in
// rider's own data.
const client = () => ({
  hgetall: <T>(key: Key) => send<T | null>({command: 'hgetall', name: key}),
  // The whole hash, in pages read side by side, for hashes too big for one response.
  // onPage gets what has arrived so far after each page, so a screen can show it at once.
  readAll: async <T>(key: Key, onPage?: (sofar: Record<string, T>) => void): Promise<Record<string, T>> => {
    const readPage = (page: number) =>
      send<{pages: number; entries: Record<string, T>}>({command: 'hpage', name: key, page});
    const first = await readPage(0);
    const all: Record<string, T> = {...first.entries};
    const rest = [...Array(Math.max(0, first.pages - 1)).keys()].map(index => index + 1);
    let waiting = rest.length;

    if (0 < waiting) onPage?.({...all});
    // The other pages all at once, each shown as it lands.
    await Promise.all(
      rest.map(async page => {
        Object.assign(all, (await readPage(page)).entries);
        if (0 < --waiting) onPage?.({...all});
      }),
    );

    return all;
  },
  hget: <T>(key: Key, field: string) => send<T | null>({command: 'hget', name: key, field}),
  hmget: <T>(key: Key, fields: string[]) => send<Record<string, T | null>>({command: 'hmget', name: key, fields}),
  hlatest: <T>(key: Key, count: number) => send<Record<string, T>>({command: 'hlatest', name: key, count}),
  hset: async (key: Key, entries: Record<string, unknown>) => {
    await Promise.all(
      Object.entries(entries).map(([field, value]) => send({command: 'hset', name: key, field, value})),
    );
  },
  hdel: (key: Key, field: string) => send({command: 'hdel', name: key, field}),
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

const getActivities = async (
  onPage?: (sofar: Record<string, DetailedActivity>) => void,
): Promise<Record<string, DetailedActivity>> => await client().readAll<DetailedActivity>(Key.DETAILS, onPage);

/** The newest activities, in one small call, to show before the whole list arrives. */
const getLatestSummaries = async (count: number): Promise<Activity[]> =>
  Object.values(await client().hlatest<Activity>(Key.ACTIVITIES, count));

/** The details of the newest activities, ahead of the rest. */
const getLatestDetails = async (count: number): Promise<Record<string, DetailedActivity>> =>
  await client().hlatest<DetailedActivity>(Key.DETAILS, count);

/** The details of a few activities, without loading them all. */
const getSomeDetails = async (ids: number[]): Promise<Record<string, DetailedActivity | null>> =>
  0 === ids.length ? {} : await client().hmget<DetailedActivity>(Key.DETAILS, ids.map(String));

const getActivitySummaries = async (onPage?: (sofar: Activity[]) => void): Promise<Activity[]> =>
  Object.values(await client().readAll<Activity>(Key.ACTIVITIES, sofar => onPage?.(Object.values(sofar))));

const getSettings = async (): Promise<Partial<Settings> | null> =>
  await client().hgetall<Partial<Settings>>(Key.SETTINGS);

const setSetting = async (field: keyof Settings, value: unknown) => {
  await client().hset(Key.SETTINGS, {[field]: value});
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
  deleteEvent,
  deleteExpense,
  deleteLabel,
  getActivities,
  getActivitySummaries,
  getLatestDetails,
  getLatestSummaries,
  getSomeDetails,
  getEvents,
  getExpenses,
  getFTPTests,
  getLabels,
  getSettings,
  setSetting,
  upsertEvent,
  upsertExpense,
  upsertFTPTest,
  upsertLabel,
};
