import {riderProfile} from './rider';
import {DetailedActivity} from './strava';

/** Whether a sport is pedalled, so that its power is a cycling effort (all rides, velomobile, handcycle). */
const isPedalled = (sport: string): boolean =>
  sport.includes('Ride') || 'Velomobile' === sport || 'Handcycle' === sport;

/** The best overall place on a segment (Strava only ranks the top 10), or null. */
const bestKomRank = (activity: DetailedActivity | null): number | null => {
  const ranks = (activity?.segment_efforts ?? []).flatMap(({kom_rank}) => (null === kom_rank ? [] : [kom_rank]));

  return 0 === ranks.length ? null : Math.min(...ranks);
};

/**
 * The normalized power the server works out from the power data, as Sauce for Strava does.
 * Until it has (or without a power meter), riders who wrote "NP: 245" in the private note
 * can have that read instead.
 */
const extractNormalizedPower = (activity: DetailedActivity | null | undefined): number | null => {
  // Running power (an Apple Watch's, say) is no cycling effort: NP and zones from it mislead.
  // Activities whose details have not arrived yet come as undefined: no NP for them yet.
  if (!activity || !isPedalled(activity.sport_type)) return null;
  if (activity.normalized_power) return activity.normalized_power;

  return riderProfile().normalizedPowerFromNote
    ? Number(activity.private_note?.match(/NP:\s*(\d+)/)?.[1]) || null
    : null;
};

export {bestKomRank, extractNormalizedPower, isPedalled};
