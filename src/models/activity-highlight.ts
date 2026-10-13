import {getWorkoutType} from './activity';
import {Activity, WorkoutType} from './strava';

type Highlight = 'race' | 'long' | null;

// Where a ride turns into a big day out.
const LONG_DISTANCE = 100 * 1000;

/** What makes an activity stand out in a list: a race first, then a 100 km day. */
const activityHighlight = (activity: Activity): Highlight => {
  if (WorkoutType.Race === getWorkoutType(activity)) return 'race';
  if (activity.distance >= LONG_DISTANCE) return 'long';

  return null;
};

type Terrain = {name: 'Flat' | 'Rolling' | 'Hilly' | 'Very hilly' | 'Mountainous'; colorPalette: string};
type Difficulty = {percent: number; terrain: Terrain; steeperThan: number | null};

// Graded against the rider's own rides: the share of them this one climbs more than.
const GRADES: [number, Terrain][] = [
  [0.2, {name: 'Flat', colorPalette: 'green'}],
  [0.5, {name: 'Rolling', colorPalette: 'blue'}],
  [0.8, {name: 'Hilly', colorPalette: 'yellow'}],
  [0.95, {name: 'Very hilly', colorPalette: 'orange'}],
  [Infinity, {name: 'Mountainous', colorPalette: 'red'}],
];
// Without enough history to compare with, metres climbed per km decide (0.5%, 1%, 1.5%, 2%).
const FIXED: [number, Terrain][] = GRADES.map(([, terrain], index) => [[5, 10, 15, 20, Infinity][index], terrain]);
const MIN_HISTORY = 20;
// Short rides climb a hill and back, which says little about the route.
const MIN_DISTANCE = 5000;

const percentOf = ({total_elevation_gain, distance}: Activity): number => (total_elevation_gain / distance) * 100;
const gradeOf = (grades: [number, Terrain][], value: number): Terrain =>
  grades.find(([limit]) => value < limit)?.[1] ?? grades[grades.length - 1][1];

/**
 * How much a ride climbs for its length, and how hard that is for this rider: ranked
 * among their other rides of the same kind, or by fixed steps while there are too few.
 */
const terrainOf = (activity: Activity, history: Activity[] = []): Difficulty | null => {
  if (0 >= activity.distance) return null;

  const percent = percentOf(activity);
  const others = history.filter(({id, distance}) => id !== activity.id && distance >= MIN_DISTANCE).map(percentOf);

  if (others.length < MIN_HISTORY) return {percent, terrain: gradeOf(FIXED, percent * 10), steeperThan: null};

  const steeperThan = others.filter(other => other < percent).length / others.length;

  return {percent, terrain: gradeOf(GRADES, steeperThan), steeperThan};
};

const TERRAIN_NAMES = GRADES.map(([, {name}]) => name);

/**
 * How a rider's rides spread over the grades, year by year, each graded against all of
 * them as terrainOf does (with the history sorted once, for a long list).
 */
const gradesByYear = (rides: Activity[]): {year: number; total: number; counts: Record<Terrain['name'], number>}[] => {
  const counted = rides.filter(({distance}) => distance >= MIN_DISTANCE);
  const sorted = counted.map(percentOf).sort((first, second) => first - second);
  // How many of the rides climb less than this share, by binary search.
  const below = (percent: number): number => {
    let low = 0;
    let high = sorted.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (sorted[middle] < percent) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const years: Record<number, {year: number; total: number; counts: Record<Terrain['name'], number>}> = {};

  for (const ride of counted) {
    const percent = percentOf(ride);
    const terrain =
      sorted.length - 1 < MIN_HISTORY ? gradeOf(FIXED, percent * 10) : gradeOf(GRADES, below(percent) / (sorted.length - 1));
    const year = Number(ride.start_date_local.slice(0, 4));
    const entry = (years[year] ??= {year, total: 0, counts: Object.fromEntries(TERRAIN_NAMES.map(name => [name, 0])) as Record<Terrain['name'], number>});
    entry.counts[terrain.name]++;
    entry.total++;
  }

  return Object.values(years).sort((first, second) => first.year - second.year);
};

export {activityHighlight, GRADES, gradesByYear, LONG_DISTANCE, terrainOf};
export type {Difficulty, Highlight, Terrain};
