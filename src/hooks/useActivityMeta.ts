import {useQuery} from '@tanstack/react-query';
import {DetailedActivity} from '../models/strava';
import {getFetcher} from './useFetcher';

const fetchMeta = getFetcher<Record<string, DetailedActivity>>('activities.meta.get');

/**
 * Every activity's details: notes, photos, calories, full tracks. They weigh several MB,
 * so a caller that can do without them passes enabled: false and gets whatever an earlier
 * page already loaded, or nothing.
 */
const useActivityMeta = ({enabled = true}: {enabled?: boolean} = {}) => {
  const {data: activityMeta = {}, isPending, isError, refetch} = useQuery({
    queryKey: ['activityMeta'],
    queryFn: fetchMeta,
    enabled,
  });

  return {activityMeta, isPending, isError, refetch};
};

export {useActivityMeta};
