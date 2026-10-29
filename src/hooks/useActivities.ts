import {useMemo, useCallback} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {ActivityFilter, dateSearchHaystack, hasEmoji, normalizeString, sortActivities} from '../models';
import {BackfillReport, SyncReport} from '../api';
import {Activity, DetailedActivity} from '../models/strava';
import {getFetcher} from './useFetcher';
import {useFtp} from './useFtp';
import {useActivityMeta} from './useActivityMeta';

const fetchActivities = getFetcher<Activity[]>('activities.get');
const fetchLatest = getFetcher<Activity[]>('activities.latest');

// Enough for the home page and the top of the list, in one small call.
const FIRST_COUNT = 20;

const byId = (activities: Activity[]): Record<number, Activity> =>
  Object.fromEntries(activities.map(activity => [activity.id, activity]));
const syncActivities = getFetcher<SyncReport>('activities.sync');
const backfillActivities = getFetcher<BackfillReport>('activities.backfill');
const fetchSomeDetails = getFetcher<Record<string, DetailedActivity | null>>('activities.details.some');

// The store reads this many entries at once.
const DETAILS_PER_READ = 50;
// One backfill at a time, however many pages ask for a sync.
let backfilling = false;
// Whether the whole list has arrived once: until then what is on screen is only its first pages.
let wholeListLoaded = false;

/**
 * The stored activities, shown at once, and a sync with Strava on every visit. A first
 * visit pages the history in over a few sync calls; the list fills up after each one.
 */
const useAllActivities = () => {
  const queryClient = useQueryClient();
  // Adds activities to what is on screen, newer copies winning.
  const addToList = useCallback(
    (...lists: Activity[][]) =>
      queryClient.setQueryData<Activity[]>(['activities'], current =>
        Object.values(Object.assign({}, byId(current ?? []), ...lists.map(byId))),
      ),
    [queryClient],
  );
  // Puts the newest activities in what is on screen, and drops the ones in their span that the
  // server no longer has: Strava's webhook removes an activity deleted on Strava from the store.
  // Strava ids grow over time, so the newest are the highest ids.
  const replaceLatest = useCallback(
    (latest: Activity[]) =>
      queryClient.setQueryData<Activity[]>(['activities'], current => {
        const lowest = latest.length < FIRST_COUNT ? 0 : Math.min(...latest.map(({id}) => id));
        const older = (current ?? []).filter(({id}) => id < lowest);

        return Object.values(Object.assign(byId(older), byId(latest)));
      }),
    [queryClient],
  );

  // On opening, the newest activities show at once, then the whole list arrives page by
  // page. Every step of a first load adds to the list rather than replacing it, so what a
  // sync brings in meanwhile stays. Once there is a list, a refresh swaps it in whole.
  const query = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      if (undefined !== queryClient.getQueryData(['activities'])) return await fetchActivities();

      addToList(await fetchLatest(FIRST_COUNT));
      const all = await fetchActivities((sofar: Activity[]) => addToList(sofar));
      wholeListLoaded = true;

      return addToList(all) ?? all;
    },
  });

  // Puts freshly stored details into what is loaded, rather than reloading them all (MBs).
  const addDetails = useCallback(
    async (ids: number[]) => {
      if (0 === ids.length) return;

      for (let start = 0; start < ids.length; start += DETAILS_PER_READ) {
        const fresh = await fetchSomeDetails(ids.slice(start, start + DETAILS_PER_READ));
        const found = Object.fromEntries(
          Object.entries(fresh).filter((entry): entry is [string, DetailedActivity] => null !== entry[1]),
        );
        queryClient.setQueryData<Record<string, DetailedActivity>>(['activityMeta'], loaded =>
          loaded ? {...loaded, ...found} : loaded,
        );
      }
      await queryClient.invalidateQueries({queryKey: ['someDetails']});
    },
    [queryClient],
  );

  const sync = useCallback(async (): Promise<SyncReport> => {
    let report: SyncReport;
    let pagedHistory = false;

    do {
      report = await syncActivities();
      pagedHistory ||= !report.historyDone;
      // A first sync pages the whole history in: the list reloads after each page of it.
      if (pagedHistory) await queryClient.invalidateQueries({queryKey: ['activities']});
    } while (!report.historyDone && !report.limited);

    // The newest activities are fetched again, not the whole list, even when this sync found none:
    // Strava's webhook stores a new activity on the server as soon as it is uploaded (and removes
    // a deleted one), so the sync has nothing to do, but this screen has not seen it yet. One
    // small call.
    if (!pagedHistory) replaceLatest(await fetchLatest(FIRST_COUNT));

    await addDetails(report.detailIds);

    // Older activities are filled in behind the scenes: nothing waits for it.
    if (!backfilling && !report.limited) {
      backfilling = true;
      void (async () => {
        try {
          await addDetails((await backfillActivities()).detailIds);
        } catch {
          // The next sync tries again.
        } finally {
          backfilling = false;
        }
      })();
    }

    return report;
  }, [queryClient, replaceLatest, addDetails]);

  useQuery({queryKey: ['sync'], queryFn: sync, retry: false});

  const refreshLatest = useCallback(() => queryClient.refetchQueries({queryKey: ['sync']}), [queryClient]);

  return {...query, refreshLatest, isComplete: wholeListLoaded || !query.isFetching};
};

const useActivities = ({
  withCommute = true,
  withPrivate,
  search = '',
  sort = 'date',
  sortDirection = 'desc',
  includedActivityTypes,
  gearId,
  years = [],
  minTime,
}: ActivityFilter) => {
  const {data: activities, refreshLatest} = useAllActivities();
  const {getFtp} = useFtp();
  // Only sorting by normalized power reads the details, so only then are they fetched.
  const {activityMeta} = useActivityMeta({enabled: 'normalized_power' === sort});
  const queryClient = useQueryClient();

  const deleteActivity = useCallback(
    (id: number) => {
      queryClient.setQueryData<Activity[]>(['activities'], old => (old ? old.filter(a => a.id !== id) : old));
    },
    [queryClient],
  );

  const filteredAndSortedActivities = useMemo(() => {
    if (!activities) return null;

    const normalizedSearch = normalizeString(search);

    return activities
      .filter(
        ({commute}) =>
          true === withCommute || ('only' === withCommute && commute) || (false === withCommute && !commute),
      )
      .filter(activity => activity.private === false || true === withPrivate)
      .filter(
        ({name, start_date}) =>
          normalizeString(name).includes(normalizedSearch) ||
          dateSearchHaystack(new Date(start_date)).includes(normalizedSearch),
      )
      .filter(({gear_id}) => gearId === undefined || gear_id === gearId || (null === gear_id && 'null' === gearId))
      .filter(({start_date}) => 0 === years.length || years.includes(new Date(start_date).getUTCFullYear()))
      .filter(({sport_type}) => undefined === includedActivityTypes || includedActivityTypes.includes(sport_type))
      .filter(({moving_time}) => undefined === minTime || moving_time >= minTime)
      .sort((a, b) =>
        sortActivities(sort, sortDirection, a, b, activityMeta[a.id] ?? null, activityMeta[b.id] ?? null, getFtp),
      );
  }, [
    activities,
    withCommute,
    withPrivate,
    search,
    gearId,
    years,
    includedActivityTypes,
    minTime,
    sort,
    sortDirection,
    activityMeta,
    getFtp,
  ]);

  const unprocessedActivities = useMemo(() => activities?.filter(({name}) => !hasEmoji(name)) ?? [], [activities]);

  return {
    activities: filteredAndSortedActivities,
    refetch: refreshLatest,
    unprocessedActivities,
    deleteActivity,
  };
};

export {useActivities, useAllActivities};
