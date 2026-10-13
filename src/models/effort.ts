import {extractNormalizedPower, isPedalled} from './activity-meta';
import {Activity, DetailedActivity} from './strava';

/**
 * The power an effort is measured by: Statva's normalized power, worked out as Sauce does,
 * and Strava's weighted power until that is in (or for estimated power, which gets none).
 * Rides only: a run's power is no cycling effort.
 */
const effortPower = (activity: Activity, detail: DetailedActivity | null): number | null =>
  isPedalled(activity.sport_type) ? (extractNormalizedPower(detail) ?? activity.weighted_average_watts ?? null) : null;

/** Intensity factor: the effort's power as a share of the FTP of the day. */
const intensityOf = (activity: Activity, detail: DetailedActivity | null, ftp: number): number | null => {
  const power = effortPower(activity, detail);

  return null === power || 0 >= ftp ? null : power / ftp;
};

export {effortPower, intensityOf};
