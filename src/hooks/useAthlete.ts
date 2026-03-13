import {useQuery} from '@tanstack/react-query';
import {Athlete} from '../models/strava';
import {getFetcher} from './useFetcher';

const fetchAthlete = getFetcher<Athlete>('athlete.get');

const useAthlete = (): Athlete | null => {
  const {data} = useQuery({
    queryKey: ['athlete'],
    queryFn: fetchAthlete,
  });

  return data ?? null;
};

export {useAthlete};
