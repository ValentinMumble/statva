import {getRandomUnusedEmoji, hasEmoji} from './label';
import {Activity} from './strava';

// How close two rides must start and end, and how alike their length, to be the same route.
const SAME_PLACE_M = 300;
const SAME_LENGTH = 0.2;
const METRES_PER_DEGREE = 111_320;

const metresBetween = ([latitudeA, longitudeA]: number[], [latitudeB, longitudeB]: number[]): number =>
  Math.hypot(
    (latitudeA - latitudeB) * METRES_PER_DEGREE,
    (longitudeA - longitudeB) * METRES_PER_DEGREE * Math.cos((latitudeA * Math.PI) / 180),
  );

const samePlace = (first: number[] | undefined, second: number[] | undefined): boolean =>
  2 === first?.length && 2 === second?.length && metresBetween(first, second) <= SAME_PLACE_M;

/** Earlier named activities of the same sport that start and end where this one does, at about its length. */
const sameRoute = (activity: Activity, history: Activity[]): Activity[] =>
  history.filter(
    other =>
      other.id !== activity.id &&
      other.sport_type === activity.sport_type &&
      hasEmoji(other.name) &&
      samePlace(other.start_latlng, activity.start_latlng) &&
      samePlace(other.end_latlng, activity.end_latlng) &&
      Math.abs(other.distance - activity.distance) <= activity.distance * SAME_LENGTH,
  );

/**
 * A name for an activity that has no emoji yet: the name most often given to the same
 * route before ("Akeneo ⚙️"), or its own name with an emoji not used yet.
 */
const suggestName = (activity: Activity, history: Activity[], usedEmojis: Set<string>): string => {
  const counts = sameRoute(activity, history).reduce(
    (names: Record<string, number>, {name}) => ({...names, [name]: (names[name] ?? 0) + 1}),
    {},
  );
  const [mostGiven] = Object.entries(counts).sort((first, second) => second[1] - first[1])[0] ?? [];

  return mostGiven ?? `${activity.name} ${getRandomUnusedEmoji(usedEmojis)}`;
};

export {suggestName};
