import {useEffect, useState} from 'react';
import {CheckIn} from '../models';
import {getCheckIns} from '../api';

const useCheckIns = (routeId: string | undefined) => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  const fetchCheckIns = async () => {
    const response = await getCheckIns();

    setCheckIns(response);
  };

  useEffect(() => {
    fetchCheckIns();
  }, []);

  return checkIns
    .filter(checkIn => undefined === routeId || checkIn.routeId === routeId)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

export {useCheckIns};
