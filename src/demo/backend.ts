import {BikeExpense, ClubRide, Event, FTPTest, Labels} from '../models';
import {Activity, DetailedActivity} from '../models/strava';
import {DEMO_CLUB, DEMO_FINISHES, DemoData, demoZones, generateDemo} from './generate';

/**
 * The demo's stand-in for the server: the same calls as the real fetchers, answered
 * from generated data held in memory. Anything logged stays until the page reloads.
 */
let data: DemoData | null = null;
const demo = (): DemoData => (data ??= generateDemo());

// A short pause makes loading states behave as they do for real.
const answer = async <T>(value: T): Promise<T> => {
  await new Promise(resolve => setTimeout(resolve, 150));

  return structuredClone(value);
};

const DAY_MS = 86_400_000;

/**
 * The demo club's calendar: every session ridden, and those between them that were missed,
 * a week apart, finishing at one of the usual bars.
 */
const demoCalendar = (): ClubRide[] => {
  const ridden = demo()
    .activities.map(({name, start_date_local}) => ({number: Number(name.match(new RegExp(`${DEMO_CLUB} #(\\d+)`))?.[1]), day: String(start_date_local).slice(0, 10)}))
    .filter(({number}) => !Number.isNaN(number))
    .sort((first, second) => first.number - second.number);
  const rides: ClubRide[] = [];
  ridden.forEach(({number, day}, index) => {
    const next = ridden[index + 1];
    for (let missing = number; missing < (next?.number ?? number + 1); missing++) {
      const date = new Date(Date.parse(`${day}T00:00:00Z`) + (missing - number) * 7 * DAY_MS).toISOString().slice(0, 10);
      rides.push({title: `${DEMO_CLUB} #${missing}`, series: DEMO_CLUB, number: missing, day: date, groups: 5 + (missing % 4), finish: DEMO_FINISHES[missing % DEMO_FINISHES.length]});
    }
  });

  return rides.reverse();
};

const upsert = <T extends {id: string}>(items: T[], item: T): T[] => [...items.filter(({id}) => id !== item.id), item];

const demoBackend = {
  getAthlete: () => answer(demo().athlete),
  getActivities: () => answer(demo().activities),
  sync: () => answer({added: 0, historyDone: true, detailIds: [], limited: false}),
  backfill: () => answer({detailIds: [], detailsMissing: 0, powerFetched: 0, limited: false}),
  refreshActivity: (id: number) => answer(demo().details[id]),
  renameActivity: async (id: number, name: string) => {
    demo().activities = demo().activities.map(activity => (activity.id === id ? {...activity, name} : activity));
    if (demo().details[id]) demo().details[id] = {...demo().details[id], name};
  },
  setActivityNote: async (id: number, note: 'description' | 'private_note', text: string) => {
    if (demo().details[id]) demo().details[id] = {...demo().details[id], [note]: text};
  },
  setActivityCommute: async (id: number, commute: boolean) => {
    demo().activities = demo().activities.map(activity => (activity.id === id ? {...activity, commute} : activity));
    if (demo().details[id]) demo().details[id] = {...demo().details[id], commute};
  },
  setActivityVisibility: async (id: number, visibility: string) => {
    const change = {visibility, private: 'only_me' === visibility};
    demo().activities = demo().activities.map(activity => (activity.id === id ? {...activity, ...change} : activity));
    if (demo().details[id]) demo().details[id] = {...demo().details[id], ...change};
  },
  setActivityGear: async (id: number, gearId: string) => {
    const newGearId = 'none' === gearId ? null : gearId;
    demo().activities = demo().activities.map(activity => (activity.id === id ? {...activity, gear_id: newGearId} : activity));
    if (demo().details[id]) demo().details[id] = {...demo().details[id], gear_id: newGearId};
  },
  getDetails: (): Promise<Record<string, DetailedActivity>> => answer(demo().details),
  getLatestSummaries: (count: number) => answer([...demo().activities].sort((a, b) => b.id - a.id).slice(0, count)),
  getLatestDetails: (count: number) =>
    answer(Object.fromEntries([...demo().activities].sort((a, b) => b.id - a.id).slice(0, count).map(({id}) => [id, demo().details[id]]))),
  getSomeDetails: (ids: number[]) => answer(Object.fromEntries(ids.map(id => [id, demo().details[id] ?? null]))),
  getEvents: () => answer(demo().events),
  setEvent: async (event: Event) => {
    demo().events = upsert(demo().events, event);
  },
  deleteEvent: async (id: string) => {
    demo().events = demo().events.filter(event => event.id !== id);
  },
  getExpenses: () => answer(demo().expenses),
  setExpense: async (expense: BikeExpense) => {
    demo().expenses = upsert(demo().expenses, expense);
  },
  deleteExpense: async (id: string) => {
    demo().expenses = demo().expenses.filter(expense => expense.id !== id);
  },
  getLabels: (): Promise<Labels> => answer(demo().labels),
  setLabel: async (key: string, value: string) => {
    demo().labels = {...demo().labels, [key]: value};
  },
  deleteLabel: async (key: string) => {
    demo().labels = Object.fromEntries(Object.entries(demo().labels).filter(([label]) => label !== key));
  },
  getFtpTests: () => answer(demo().ftpTests),
  setFtpTest: async (test: FTPTest) => {
    demo().ftpTests = upsert(demo().ftpTests, test).sort((a, b) => b.date.getTime() - a.date.getTime());
  },
  getSettings: () => answer(demo().settings),
  setSetting: async (field: string, value: unknown) => {
    demo().settings = {...demo().settings, [field]: value};
  },
  getClubCalendar: () => answer({rides: demoCalendar(), complete: true}),
  getZones: (id: number) => {
    const activity = demo().activities.find(activity => activity.id === id);

    return answer(undefined === activity ? [] : demoZones(activity as Activity));
  },
};

export {demoBackend};
