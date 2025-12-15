import {useState, ReactNode, createContext, useEffect} from 'react';
import {FTPTest} from '../models';
import {Athlete} from '../models/strava';
import {useFetcher} from '../hooks';

const AthleteContext = createContext<[Athlete | null, FTPTest[], () => Promise<void>]>([null, [], Promise.resolve]);

type AthleteProviderProps = {
  children?: ReactNode;
};

const AthleteProvider = ({children}: AthleteProviderProps) => {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [ftpTests, setFtpTests] = useState<FTPTest[]>([]);
  const getAthlete = useFetcher<Athlete>('athlete.get');
  const getFTPTests = useFetcher<FTPTest[]>('ftp_tests.get');

  const fetchData = async () => {
    const [athleteData, ftpTestsData] = await Promise.all([getAthlete(), getFTPTests()]);
    setAthlete(athleteData);
    setFtpTests(ftpTestsData);
  };

  useEffect(() => {
    fetchData();
  }, [getAthlete, getFTPTests]);

  return <AthleteContext.Provider value={[athlete, ftpTests, fetchData]}>{children}</AthleteContext.Provider>;
};

export {AthleteProvider, AthleteContext};
