import {useState, ReactNode, createContext, useEffect} from 'react';
import {fetchAthlete} from '../strava';
import {FTPTest} from '../models';
import {DetailedAthlete} from '../models/strava';
import {getFTPTests} from '../redis';

const AthleteContext = createContext<[DetailedAthlete | null, FTPTest[], () => Promise<void>]>([
  null,
  [],
  () => Promise.resolve(),
]);

type AthleteProviderProps = {
  children?: ReactNode;
};

const AthleteProvider = ({children}: AthleteProviderProps) => {
  const [athlete, setAthlete] = useState<DetailedAthlete | null>(null);
  const [ftpTests, setFtpTests] = useState<FTPTest[]>([]);

  const fetchData = async () => {
    setAthlete(await fetchAthlete());
    setFtpTests(await getFTPTests());
  };

  useEffect(() => {
    fetchData();
  }, []);

  return <AthleteContext.Provider value={[athlete, ftpTests, fetchData]}>{children}</AthleteContext.Provider>;
};

export {AthleteProvider, AthleteContext};
