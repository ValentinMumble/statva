import {useQuery} from '@tanstack/react-query';
import {extractEmoji, GetLabel, Labels} from '../models';
import {getFetcher} from './useFetcher';

const fetchLabels = getFetcher<Labels>('labels.get');

const useLabels = (): [GetLabel, Labels, () => Promise<void>] => {
  const {data: labels = {}, refetch} = useQuery({
    queryKey: ['labels'],
    queryFn: fetchLabels,
    staleTime: 5 * 60 * 1000,
  });

  return [
    (key, emojiOnly = false) =>
      null === key ? '🤷' : emojiOnly ? extractEmoji(labels[key] ?? key) : labels[key] ?? key,
    labels,
    async () => {
      await refetch();
    },
  ];
};

export {useLabels};
