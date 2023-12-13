import {useEffect, useState} from 'react';
import {DetailedAthlete} from '../models/strava';
import {fetchAthlete as fetchStravaAthlete} from '../strava';

const useAthlete = () => {
  const [athlete, setAthlete] = useState<DetailedAthlete | null>(null);

  useEffect(() => {
    const fetchAthlete = async () => {
      const athlete = await fetchStravaAthlete();

      setAthlete(athlete);
    };

    fetchAthlete();
  }, []);

  return athlete;
};

export {useAthlete};
