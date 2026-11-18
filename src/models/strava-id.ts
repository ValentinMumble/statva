/**
 * Strava ids are 64-bit integers, bigger than a JavaScript number holds exactly, so Statva keeps
 * them as strings (the server turns them into strings before parsing Strava's answers).
 */

/** Orders two ids as numbers, oldest first (Strava ids grow over time), without turning them into numbers. */
const compareIds = (first: string, second: string): number =>
  first.length - second.length || (first < second ? -1 : first > second ? 1 : 0);

export {compareIds};
