import {useMemo, useCallback} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {ActivityFilter, dateSearchHaystack, normalizeString, sortActivities} from '../models';
import {SyncReport} from '../api';
import {Activity} from '../models/strava';
import {getFetcher} from './useFetcher';
import {useFtp} from './useFtp';
import {useActivityMeta} from './useActivityMeta';

const fetchActivities = getFetcher<Activity[]>('activities.get');
const syncActivities = getFetcher<SyncReport>('activities.sync');

/**
 * The stored activities, shown at once, and a sync with Strava on every visit. A first
 * visit pages the history in over a few sync calls; the list fills up after each one.
 */
const useAllActivities = () => {
  const queryClient = useQueryClient();
  const query = useQuery({queryKey: ['activities'], queryFn: fetchActivities});

  const sync = useCallback(async (): Promise<SyncReport> => {
    let report: SyncReport;

    do {
      report = await syncActivities();
      await queryClient.invalidateQueries({queryKey: ['activities']});
    } while (!report.historyDone && !report.limited);

    if (0 < report.detailsFetched) await queryClient.invalidateQueries({queryKey: ['activityMeta']});

    return report;
  }, [queryClient]);

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
    () => activities?.filter(activity => !activity.name.match(/[\p{Emoji}]/gu)) ?? [],
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
