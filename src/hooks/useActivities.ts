import {useMemo, useCallback} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {ActivityFilter, sortActivities} from '../models';
import {Activity} from '../models/strava';
import {getFetcher} from './useFetcher';
import {useFtp} from './useFtp';
import {useActivityMeta} from './useActivityMeta';

const fetchActivities = getFetcher<[Activity[], boolean]>('activities.get');
const FIRST_PAGE_SIZE = 30;

const useAllActivities = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['activities'],
    queryFn: async (): Promise<Activity[]> => {
      const activities: Record<string, Activity> = {};

      const [firstPage, hasMoreAfterFirst] = await fetchActivities(1, FIRST_PAGE_SIZE);
      firstPage.forEach(activity => (activities[activity.id] = activity));

      if (hasMoreAfterFirst) {
        queryClient.setQueryData<Activity[]>(['activities'], Object.values(activities));

        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const [pageActivities, more] = await fetchActivities(page);
          pageActivities.forEach(activity => (activities[activity.id] = activity));
          hasMore = more;
          page++;

          if (hasMore) {
            queryClient.setQueryData<Activity[]>(['activities'], Object.values(activities));
          }
        }
      }

      return Object.values(activities);
    },
  });
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
  const {data: activities, refetch} = useAllActivities();
  const {getFtp} = useFtp();
  const {activityMeta} = useActivityMeta();
  const queryClient = useQueryClient();

  const deleteActivity = useCallback(
    (id: number) => {
      queryClient.setQueryData<Activity[]>(['activities'], old => (old ? old.filter(a => a.id !== id) : old));
    },
    [queryClient],
  );

  const filteredAndSortedActivities = useMemo(() => {
    if (!activities) return null;

    return activities
      .filter(
        ({commute}) =>
          true === withCommute || ('only' === withCommute && commute) || (false === withCommute && !commute),
      )
      .filter(activity => activity.private === false || true === withPrivate)
      .filter(({name}) =>
        name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(
            search
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase(),
          ),
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
    refetch: () => { refetch(); },
    unprocessedActivities,
    deleteActivity,
  };
};

export {useActivities, useAllActivities};
