import {DetailedActivity} from './strava';

const hasKom = (activity: DetailedActivity | null): boolean =>
  activity?.segment_efforts.some(effort => effort.kom_rank === 1) ?? false;

const extractNormalizedPower = (activity: DetailedActivity | null): number | null =>
  Number(activity?.private_note?.match(/NP:\s*(\d+)/)?.[1]) || null;

export {extractNormalizedPower, hasKom};
