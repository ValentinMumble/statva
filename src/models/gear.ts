import {DetailedAthlete} from './strava';
import {extractEmoji} from './util';

const getGearEmoji = (athlete: DetailedAthlete | null, gearId: string) => {
  if (null === athlete) {
    return '🤷';
  }

  return extractEmoji([...athlete.bikes, ...athlete.shoes].find(({id}) => id === gearId)?.name ?? '🤷');
};

export {getGearEmoji};
