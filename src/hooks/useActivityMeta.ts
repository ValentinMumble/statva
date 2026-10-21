import {useQuery, useQueryClient} from '@tanstack/react-query';
import {DetailedActivity} from '../models/strava';
import {getFetcher} from './useFetcher';

const fetchMeta = getFetcher<Record<string, DetailedActivity>>('activities.meta.get');
const fetchLatestMeta = getFetcher<Record<string, DetailedActivity>>('activities.meta.latest');

// The details of the newest activities come first, for the top of a list.
const FIRST_COUNT = 20;

/**
 * Every activity's details: notes, photos, calories, full tracks. They weigh several MB,
 * so a caller that can do without them passes enabled: false and gets whatever an earlier
 * page already loaded, or nothing.
 */
const useActivityMeta = ({enabled = true}: {enabled?: boolean} = {}) => {
  const queryClient = useQueryClient();
  // Pages show the details as they arrive, page by page, rather than after the last one.
  const {
    data: activityMeta = {},
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['activityMeta'],
    queryFn: async () => {
      if (undefined !== queryClient.getQueryData(['activityMeta'])) return await fetchMeta();

      const latest = await fetchLatestMeta(FIRST_COUNT);
      queryClient.setQueryData(['activityMeta'], latest);

      return await fetchMeta((sofar: Record<string, DetailedActivity>) =>
        queryClient.setQueryData(['activityMeta'], {...sofar, ...latest}),
      );
    },
    enabled,
  });

  return {activityMeta, isPending, isError, refetch};
};

const fetchSomeDetails = getFetcher<Record<string, DetailedActivity | null>>('activities.details.some');

/** The details of a few activities only, for a page that shows a handful of them. */
const useSomeActivityDetails = (ids: number[]): Record<string, DetailedActivity | null> => {
  const {data = {}} = useQuery({
    queryKey: ['someDetails', ids.join(',')],
    queryFn: () => fetchSomeDetails(ids),
    enabled: 0 < ids.length,
  });

  return data;
};

export {useActivityMeta, useSomeActivityDetails};
