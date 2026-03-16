import {StatEntry} from './types';
import {GLOBAL_STATS} from './global-stats';
import {RIDE_STATS} from './ride-stats';
import {RUN_STATS} from './run-stats';
import {SWIM_STATS} from './swim-stats';
import {TENNIS_STATS} from './tennis-stats';

const STATS: Record<string, StatEntry[][]> = {
  Ride: RIDE_STATS,
  Run: RUN_STATS,
  Swim: SWIM_STATS,
  Tennis: TENNIS_STATS,
};

export {GLOBAL_STATS, STATS};
export type {StatEntry};
