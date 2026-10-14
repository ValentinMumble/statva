import {ClubRules} from './activity-npeloton';
import {Event} from './event';

/**
 * A ride that comes back again and again, like a commute: one that turns around at the place
 * (there and back, or ending there), on a weekday if asked and no longer than maxKm, gets the
 * name, the commute flag and the bike as soon as it lands on Strava. The server applies these
 * (api/_lib/rules.ts).
 */
type RideRule = {
  name: string;
  place: [number, number];
  radiusM: number;
  maxKm: number;
  weekdaysOnly: boolean;
  commute: boolean;
  gearId: string | null;
};

/**
 * Everything that used to be written into the code for one rider. Each rider's stored
 * settings sit on top of these defaults, so a new rider sees a working app at once.
 */
type Settings = {
  // The bike every panel opens on; null means the primary bike on Strava.
  defaultBike: string | null;
  // The bike the cost per km chart follows; null means the default bike.
  costBike: string | null;
  retiredBikes: string[];
  retiredChains: string[];
  partLimitsKm: Partial<Record<Event['type'], number>>;
  // What one replacement of each part costs, in euros.
  partPricesEur: Partial<Record<Event['type'], number>>;
  yearGoalKm: number;
  // What a km by car would cost, in euros, to count what commuting by bike saves.
  carCostPerKm: number;
  sports: string[];
  heartRate: {zones: number[]};
  weightKg: number;
  // Where maps open when there is nothing better to centre on.
  mapCenter: [number, number];
  locale: string;
  normalizedPowerFromNote: boolean;
  unprocessedEmoji: boolean;
  // Rides whose name holds one of the group words, or whose notes hold a group tag, count as group rides.
  club: (ClubRules & {groupWords: string[]; groupTags: string[]}) | null;
  rideRules: RideRule[];
  // How far a pair of running shoes goes before it is worn out.
  shoeLifeKm: number;
};

const DEFAULT_SETTINGS: Settings = {
  defaultBike: null,
  costBike: null,
  retiredBikes: [],
  retiredChains: [],
  partLimitsKm: {chain: 400, tire: 8000, cassette: 30000},
  partPricesEur: {},
  yearGoalKm: 5000,
  carCostPerKm: 0.3,
  sports: ['Ride', 'Run'],
  heartRate: {zones: [117, 143, 162, 181]},
  weightKg: 74,
  mapCenter: [48.86, 2.35],
  locale: 'en-GB',
  normalizedPowerFromNote: false,
  unprocessedEmoji: false,
  club: null,
  rideRules: [],
  shoeLifeKm: 700,
};

export {DEFAULT_SETTINGS};
export type {RideRule, Settings};
