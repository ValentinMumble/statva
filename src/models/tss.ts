import {extractNormalizedPower, isPedalled} from './activity-meta';
import {riderProfile} from './rider';
import {Activity, DetailedActivity} from './strava';

/**
 * The power an effort is measured by: Statva's normalized power, worked out as Sauce does,
 * and Strava's weighted power until that is in (or for estimated power, which gets none).
 * Rides only: a run's power is no cycling effort, so its TSS comes from heart rate.
 */
const effortPower = (activity: Activity, detail: DetailedActivity | null): number | null =>
  isPedalled(activity.sport_type) ? (extractNormalizedPower(detail) ?? activity.weighted_average_watts ?? null) : null;

/** Intensity factor: the effort's power as a share of the FTP of the day. */
const intensityOf = (activity: Activity, detail: DetailedActivity | null, ftp: number): number | null => {
  const power = effortPower(activity, detail);

  return null === power || 0 >= ftp ? null : power / ftp;
};

/**
 * Power-based TSS (TrainingPeaks standard):
 * TSS = (duration_s × NP × IF) / (FTP × 3600) × 100
 * where IF (Intensity Factor) = NP / FTP
 * Simplified: (duration_s × NP²) / (FTP² × 3600) × 100
 */
const powerTSS = (durationSeconds: number, normalizedPower: number, ftp: number): number =>
  ((durationSeconds * normalizedPower * normalizedPower) / (ftp * ftp * 3600)) * 100;

/**
 * HR-based TSS (hrTSS) using Karvonen TRIMP method:
 * Uses exponential weighting so higher HR = disproportionately more stress.
 * Calibrated so 1h at LTHR ≈ 100 hrTSS.
 */
const hrTSS = (durationSeconds: number, avgHeartrate: number): number => {
  const {max: MAX_HR, resting: RESTING_HR, threshold: LTHR} = riderProfile().heartRate;
  const hrReserve = MAX_HR - RESTING_HR;
  if (hrReserve === 0) return 0;

  const hrRatio = Math.max(0, (avgHeartrate - RESTING_HR) / hrReserve);
  const lthrRatio = (LTHR - RESTING_HR) / hrReserve;
  const durationHours = durationSeconds / 3600;

  const trimp = (ratio: number) => ratio * 1.92 * Math.exp(1.67 * ratio);

  const lthrTrimp = trimp(lthrRatio);
  if (lthrTrimp === 0) return 0;

  return ((durationHours * trimp(hrRatio)) / lthrTrimp) * 100;
};

type TSSResult = {value: number; source: 'power' | 'hr'} | null;

/**
 * Compute TSS for an activity: from its effort power (see effortPower) and the FTP when
 * both are there, otherwise from heart rate (hrTSS).
 */
const computeTSS = (activity: Activity, ftp: number, detail: DetailedActivity | null = null): TSSResult => {
  const power = effortPower(activity, detail);

  if (power && ftp > 0) {
    return {
      value: Math.round(powerTSS(activity.moving_time, power, ftp)),
      source: 'power',
    };
  }

  if (activity.average_heartrate && activity.average_heartrate > riderProfile().heartRate.resting) {
    return {
      value: Math.round(hrTSS(activity.moving_time, activity.average_heartrate)),
      source: 'hr',
    };
  }

  return null;
};

export {computeTSS, effortPower, intensityOf};
export type {TSSResult};
