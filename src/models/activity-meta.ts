import {riderProfile} from './rider';
import {DetailedActivity} from './strava';

const hasKom = (activity: DetailedActivity | null): boolean =>
  activity?.segment_efforts.some(effort => effort.kom_rank === 1) ?? false;

// Riders who log it write "NP: 245" in the private note; for everyone else it stays empty.
const extractNormalizedPower = (activity: DetailedActivity | null): number | null =>
  riderProfile().normalizedPowerFromNote ? Number(activity?.private_note?.match(/NP:\s*(\d+)/)?.[1]) || null : null;

export {extractNormalizedPower, hasKom};
