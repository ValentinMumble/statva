import {BikeExpense, Event, FTPTest, Labels} from '../models';
import {Activity, DetailedActivity} from '../models/strava';
import {DemoData, demoZones, generateDemo} from './generate';

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
  getZones: (id: number) => {
    const activity = demo().activities.find(activity => activity.id === id);

    return answer(undefined === activity ? [] : demoZones(activity as Activity));
  },
};

export {demoBackend};
