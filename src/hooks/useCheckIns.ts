import {useQuery} from '@tanstack/react-query';
import {getCheckIns} from '../api';

const useCheckIns = (routeId: string | undefined) => {
  const {data: checkIns = []} = useQuery({
    queryKey: ['checkIns'],
    queryFn: getCheckIns,
  });

  return checkIns
    .filter(checkIn => undefined === routeId || checkIn.routeId === routeId)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

export {useCheckIns};
