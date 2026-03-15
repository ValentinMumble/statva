import {useQuery} from '@tanstack/react-query';
import {DetailedActivity} from '../models/strava';
import {getFetcher} from './useFetcher';

const fetchMeta = getFetcher<Record<string, DetailedActivity>>('activities.meta.get');

const useActivityMeta = (): [Record<string, DetailedActivity>, () => Promise<void>] => {
  const {data = {}, refetch} = useQuery({
    queryKey: ['activityMeta'],
    queryFn: fetchMeta,
  });

  return [
    data,
    async () => {
      await refetch();
    },
  ];
};

export {useActivityMeta};
