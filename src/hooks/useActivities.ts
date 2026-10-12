import {useMemo, useCallback} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {ActivityFilter, dateSearchHaystack, hasEmoji, normalizeString, sortActivities} from '../models';
import {SyncReport} from '../api';
import {Activity} from '../models/strava';
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

  // On opening, the newest activities show at once, then the whole list arrives page by
  // page. Every step of a first load adds to the list rather than replacing it, so what a
  // sync brings in meanwhile stays. Once there is a list, a refresh swaps it in whole.
  const query = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      if (undefined !== queryClient.getQueryData(['activities'])) return await fetchActivities();

      addToList(await fetchLatest(FIRST_COUNT));
      const all = await fetchActivities((sofar: Activity[]) => addToList(sofar));

      return addToList(all) ?? all;
    },
  });

  const sync = useCallback(async (): Promise<SyncReport> => {
    let report: SyncReport;
    let pagedHistory = false;

    do {
      report = await syncActivities();
      pagedHistory ||= !report.historyDone;
      // A first sync pages the whole history in: the list reloads after each page of it.
      if (pagedHistory) await queryClient.invalidateQueries({queryKey: ['activities']});
    } while (!report.historyDone && !report.limited);

    // Usually only a few new activities: the newest ones are fetched and added, not the whole list.
    if (!pagedHistory && 0 < report.added) addToList(await fetchLatest(FIRST_COUNT));

    if (0 < report.detailsFetched) {
      await queryClient.invalidateQueries({queryKey: ['activityMeta']});
      await queryClient.invalidateQueries({queryKey: ['someDetails']});
    }

    return report;
  }, [queryClient, addToList]);

  useQuery({queryKey: ['sync'], queryFn: sync, retry: false});

  const refreshLatest = useCallback(() => queryClient.refetchQueries({queryKey: ['sync']}), [queryClient]);

  return {...query, refreshLatest};
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

  const unprocessedActivities = useMemo(
    () => activities?.filter(({name}) => !hasEmoji(name)) ?? [],
    [activities],
  );

  return {
    activities: filteredAndSortedActivities,
    refetch: refreshLatest,
    unprocessedActivities,
    deleteActivity,
  };
};

export {useActivities, useAllActivities};
