/**
 * The few facts about the rider that calculations everywhere depend on: heart rate for
 * training stress and zones, weight for calorie estimates, and whether normalized power
 * is read from private notes. Settings set it as soon as they load (useSettings); until
 * then, and in tests, these values apply.
 */
type RiderProfile = {
  heartRate: {max: number; resting: number; threshold: number; zones: number[]};
  weightKg: number;
  normalizedPowerFromNote: boolean;
};

const BASELINE: RiderProfile = {
  heartRate: {max: 188, resting: 52, threshold: 172, zones: [117, 143, 162, 181]},
  weightKg: 74,
  normalizedPowerFromNote: true,
};

let current: RiderProfile = BASELINE;

const riderProfile = (): RiderProfile => current;

/** Replaces the profile. Calling it again with the same values changes nothing. */
const setRiderProfile = (profile: RiderProfile) => {
  current = profile;
};

export {riderProfile, setRiderProfile};
export type {RiderProfile};
