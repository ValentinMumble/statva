import {useQuery} from '@tanstack/react-query';
import {DEFAULT_LABELS, extractEmoji, gearOf, GetLabel, Labels} from '../models';
import {useAthlete} from './useAthlete';
import {getFetcher} from './useFetcher';

const fetchLabels = getFetcher<Labels>('labels.get');

const useLabels = () => {
  const {data: labels = {}, refetch} = useQuery({
    queryKey: ['labels'],
    queryFn: fetchLabels,
  });
  const athlete = useAthlete();

  // The rider's own labels win over their Strava gear names, which win over the defaults.
  const gearNames = Object.fromEntries(gearOf(athlete).map(({id, name}) => [id, name]));
  const all: Labels = {...DEFAULT_LABELS, ...gearNames, ...labels};

  const label: GetLabel = (key, emojiOnly = false) =>
    null === key ? '🤷' : emojiOnly ? extractEmoji(all[key] ?? key) : all[key] ?? key;

  return {label, labels, refetch};
};

export {useLabels};
