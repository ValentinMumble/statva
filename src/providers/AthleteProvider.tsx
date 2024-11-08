import {useState, ReactNode, createContext, useEffect} from 'react';
import {FTPTest} from '../models';
import {DetailedAthlete} from '../models/strava';
import {useFetcher} from '../hooks';

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
  const getAthlete = useFetcher<DetailedAthlete>('athlete.get');
  const getFTPTests = useFetcher<FTPTest[]>('ftp_tests.get');

  const fetchData = async () => {
    setAthlete(await getAthlete());
    setFtpTests(await getFTPTests());
  };

  useEffect(() => {
    fetchData();
  }, [getAthlete, getFTPTests]);

  return <AthleteContext.Provider value={[athlete, ftpTests, fetchData]}>{children}</AthleteContext.Provider>;
};

export {AthleteProvider, AthleteContext};
