import {useContext} from 'react';
import {AthleteContext} from '../providers';

const useAthlete = () => {
  const [athlete] = useContext(AthleteContext);

  return athlete;
};

export {useAthlete};
