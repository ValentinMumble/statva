import {
  BikeExpense,
  ClubRide,
  CopyResult,
  CopyStart,
  decodePolyline,
  encodePolyline,
  Event,
  FTPTest,
  Labels,
  MergeChoice,
  MergeResult,
  mergePlan,
} from '../models';
import {UploadRefusedError} from '../api/strava';
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
    .activities.map(({name, start_date_local}) => ({
      number: Number(name.match(new RegExp(`${DEMO_CLUB} #(\\d+)`))?.[1]),
      day: String(start_date_local).slice(0, 10),
    }))
    .filter(({number}) => !Number.isNaN(number))
    .sort((first, second) => first.number - second.number);
  const rides: ClubRide[] = [];
  ridden.forEach(({number, day}, index) => {
    const next = ridden[index + 1];
    for (let missing = number; missing < (next?.number ?? number + 1); missing++) {
      const date = new Date(Date.parse(`${day}T00:00:00Z`) + (missing - number) * 7 * DAY_MS)
        .toISOString()
        .slice(0, 10);
      rides.push({
        title: `${DEMO_CLUB} #${missing}`,
        series: DEMO_CLUB,
        number: missing,
        day: date,
        groups: 5 + (missing % 4),
        finish: DEMO_FINISHES[missing % DEMO_FINISHES.length],
      });
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
  setActivityGear: async (id: number, gearId: string) => {
    const newGearId = 'none' === gearId ? null : gearId;
    demo().activities = demo().activities.map(activity =>
      activity.id === id ? {...activity, gear_id: newGearId} : activity,
    );
    if (demo().details[id]) demo().details[id] = {...demo().details[id], gear_id: newGearId};
  },
  // As Strava would make it from the joined data: a new activity, newest id, the parts left as
  // they are for the rider to delete.
  mergeActivities: ({ids, name, gearId, commute}: MergeChoice): Promise<MergeResult> => {
    const plan = mergePlan(demo().activities.filter(({id}) => ids.includes(id)));
    const [first] = plan.parts;
    const id = Math.max(...demo().activities.map(activity => activity.id)) + 1;
    const polyline = encodePolyline(plan.parts.flatMap(({map}) => decodePolyline(map?.summary_polyline ?? '')));
    const activity: Activity = {
      ...first,
      id,
      name,
      commute,
      gear_id: 'none' === gearId ? null : gearId,
      distance: plan.distance,
      moving_time: plan.movingTime,
      elapsed_time: plan.elapsedTime,
      total_elevation_gain: plan.parts.reduce((sum, part) => sum + part.total_elevation_gain, 0),
      kudos_count: 0,
      map: {...first.map, summary_polyline: polyline},
    };
    demo().activities = [...demo().activities, activity];
    demo().details[id] = {...demo().details[first.id], ...activity, segment_efforts: []};

    return answer({outcome: 'merged', activity, parts: plan.parts.map(part => part.id)});
  },
  // The day and time asked for (today at the ride's own time by default) in the browser's time
  // zone, near enough for the demo, once the copy would be over.
  copyActivity: (id: number, {date, time}: CopyStart = {}): Promise<CopyResult> => {
    const original = demo().activities.find(activity => activity.id === id);
    if (undefined === original) return Promise.reject(new UploadRefusedError('The activity is not on Strava any more'));
    const day = date ?? new Date().toLocaleDateString('en-CA');
    const start = new Date(`${day}T${time ?? String(original.start_date_local).slice(11, 16)}`);
    const end = start.getTime() + original.elapsed_time * 1000;
    if (end > Date.now()) {
      const at = new Date(end).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      return Promise.reject(new UploadRefusedError(`The copy would end on ${at}, still to come: pick an earlier time`));
    }

    const copyId = Math.max(...demo().activities.map(activity => activity.id)) + 1;
    const activity: Activity = {
      ...original,
      id: copyId,
      start_date: start.toISOString(),
      start_date_local: `${day}T${time ?? String(original.start_date_local).slice(11, 16)}:00Z`,
      kudos_count: 0,
    };
    demo().activities = [...demo().activities, activity];
    demo().details[copyId] = {...demo().details[id], ...activity, segment_efforts: []};

    return answer({outcome: 'copied', activity});
  },
  getDetails: (): Promise<Record<string, DetailedActivity>> => answer(demo().details),
  getLatestSummaries: (count: number) => answer([...demo().activities].sort((a, b) => b.id - a.id).slice(0, count)),
  getLatestDetails: (count: number) =>
    answer(
      Object.fromEntries(
        [...demo().activities]
          .sort((a, b) => b.id - a.id)
          .slice(0, count)
          .map(({id}) => [id, demo().details[id]]),
      ),
    ),
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
  getComments: (id: number) => {
    const count = demo().activities.find(activity => activity.id === id)?.comment_count ?? 0;
    const texts = ['Great pace tonight!', 'See you next week', 'That last climb though'];
    const start = new Date(demo().activities.find(activity => activity.id === id)?.start_date ?? Date.now()).getTime();

    return answer(
      texts.slice(0, count).map((text, index) => ({
        id: id * 10 + index,
        activity_id: id,
        text,
        athlete: {firstname: ['Camille', 'Jules', 'Inès'][index], lastname: 'D.'},
        created_at: new Date(start + (index + 3) * 3_600_000).toISOString(),
        reaction_count: index,
        has_reacted: 1 === index,
      })),
    );
  },
  getZones: (id: number) => {
    const activity = demo().activities.find(activity => activity.id === id);

    return answer(undefined === activity ? [] : demoZones(activity as Activity));
  },
};

export {demoBackend};
