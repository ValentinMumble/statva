import {riderProfile} from './rider';
import {DetailedActivity} from './strava';

/** Whether a sport is pedalled, so that its power is a cycling effort (all rides, velomobile, handcycle). */
const isPedalled = (sport: string): boolean => sport.includes('Ride') || 'Velomobile' === sport || 'Handcycle' === sport;

const hasKom = (activity: DetailedActivity | null): boolean =>
  activity?.segment_efforts.some(effort => effort.kom_rank === 1) ?? false;

/**
 * The normalized power the server works out from the power data, as Sauce for Strava does.
 * Until it has (or without a power meter), riders who wrote "NP: 245" in the private note
 * can have that read instead.
 */
const extractNormalizedPower = (activity: DetailedActivity | null): number | null => {
  // Running power (an Apple Watch's, say) is no cycling effort: NP and zones from it mislead.
  if (null !== activity && !isPedalled(activity.sport_type)) return null;
  if (activity?.normalized_power) return activity.normalized_power;

  return riderProfile().normalizedPowerFromNote ? Number(activity?.private_note?.match(/NP:\s*(\d+)/)?.[1]) || null : null;
};

export {extractNormalizedPower, hasKom, isPedalled};
