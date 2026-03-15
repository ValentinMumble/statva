import {useQuery} from '@tanstack/react-query';
import {DetailedActivity} from '../models/strava';
import {getFetcher} from './useFetcher';

const fetchMeta = getFetcher<Record<string, DetailedActivity>>('activities.meta.get');

const useActivityMeta = () => {
  const {data: activityMeta = {}, refetch} = useQuery({
    queryKey: ['activityMeta'],
    queryFn: fetchMeta,
  });

  return {activityMeta, refetch};
};

export {useActivityMeta};
