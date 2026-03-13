import {useQuery} from '@tanstack/react-query';
import {DetailedActivity} from '../models/strava';
import {getFetcher} from './useFetcher';

const fetchMeta = getFetcher<Record<string, DetailedActivity>>('activities.meta.get');

const useActivityMeta = (): [Record<string, DetailedActivity>, () => Promise<void>] => {
  const {data = {}, refetch} = useQuery({
    queryKey: ['activityMeta'],
    queryFn: fetchMeta,
    staleTime: 5 * 60 * 1000,
  });

  return [
    data,
    async () => {
      await refetch();
    },
  ];
};

export {useActivityMeta};
