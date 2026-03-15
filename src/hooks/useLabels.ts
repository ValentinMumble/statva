import {useQuery} from '@tanstack/react-query';
import {extractEmoji, GetLabel, Labels} from '../models';
import {getFetcher} from './useFetcher';

const fetchLabels = getFetcher<Labels>('labels.get');

const useLabels = () => {
  const {data: labels = {}, refetch} = useQuery({
    queryKey: ['labels'],
    queryFn: fetchLabels,
  });

  const label: GetLabel = (key, emojiOnly = false) =>
    null === key ? '🤷' : emojiOnly ? extractEmoji(labels[key] ?? key) : labels[key] ?? key;

  return {label, labels, refetch};
};

export {useLabels};
