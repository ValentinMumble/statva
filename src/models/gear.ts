import {SummaryGear} from './strava';
import {extractEmoji} from './util';

const getBikeEmoji = (bikes: SummaryGear[], bikeId: string) =>
  extractEmoji(bikes.find(({id}) => id === bikeId)?.name ?? '');

export {getBikeEmoji};
