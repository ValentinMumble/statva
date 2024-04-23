import {ActivityType, DetailedAthlete} from './strava';
import {extractEmoji} from './util';

const getGearEmoji = (athlete: DetailedAthlete | null, type: ActivityType, gearId: string) => {
  if (null === athlete) {
    return '🤷';
  }

  return extractEmoji(
    (ActivityType.Run === type ? athlete.shoes : athlete.bikes).find(({id}) => id === gearId)?.name ?? '🤷'
  );
};

export {getGearEmoji};
