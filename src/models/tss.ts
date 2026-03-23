import {Activity} from './strava';

const MAX_HR = 188;
const RESTING_HR = 52;
const LTHR = 172;

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
 * Compute TSS for an activity.
 * Uses power-based TSS when weighted_average_watts + FTP are available.
 * Falls back to HR-based hrTSS.
 */
const computeTSS = (activity: Activity, ftp: number): TSSResult => {
  if (activity.weighted_average_watts && ftp > 0) {
    return {
      value: Math.round(powerTSS(activity.moving_time, activity.weighted_average_watts, ftp)),
      source: 'power',
    };
  }

  if (activity.average_heartrate && activity.average_heartrate > RESTING_HR) {
    return {
      value: Math.round(hrTSS(activity.moving_time, activity.average_heartrate)),
      source: 'hr',
    };
  }

  return null;
};

export {computeTSS};
export type {TSSResult};
