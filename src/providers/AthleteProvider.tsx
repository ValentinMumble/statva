import {useState, ReactNode, createContext, useEffect} from 'react';
import {DetailedAthlete} from '../models/strava';
import {fetchAthlete} from '../strava';

const AthleteContext = createContext<[DetailedAthlete | null, boolean]>([null, true]);

type AthleteProviderProps = {
  children?: ReactNode;
};

const AthleteProvider = ({children}: AthleteProviderProps) => {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [athlete, setAthlete] = useState<DetailedAthlete | null>(null);

  useEffect(() => {
    const doFetchAthlete = async () => {
      setLoading(true);
      const athlete = await fetchAthlete();

      setAthlete(athlete);
      setLoading(false);
    };

    doFetchAthlete();
  }, []);

  return <AthleteContext.Provider value={[athlete, isLoading]}>{children}</AthleteContext.Provider>;
};

export {AthleteProvider, AthleteContext};
