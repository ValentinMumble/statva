import {useState, ReactNode, createContext, useEffect} from 'react';
import {fetchAthlete} from '../strava';
import {FTPTest} from '../models';
import {DetailedAthlete} from '../models/strava';
import {getFTPTests} from '../redis';

const AthleteContext = createContext<[DetailedAthlete | null, FTPTest[]]>([null, []]);

type AthleteProviderProps = {
  children?: ReactNode;
};

const AthleteProvider = ({children}: AthleteProviderProps) => {
  const [athlete, setAthlete] = useState<DetailedAthlete | null>(null);
  const [ftpTests, setFtpTests] = useState<FTPTest[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setAthlete(await fetchAthlete());
      setFtpTests(await getFTPTests());
    };

    fetchData();
  }, []);

  return <AthleteContext.Provider value={[athlete, ftpTests]}>{children}</AthleteContext.Provider>;
};

export {AthleteProvider, AthleteContext};
