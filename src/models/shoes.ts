import {Activity} from './strava';

type ShoeWear = {id: string; distance: number; life: number; ratio: number; weeksLeft: number | null};

const WEEK_MS = 7 * 86400000;
// The recent pace is read over this many weeks, as for bike parts.
const PACE_WEEKS = 8;

/**
 * How far each pair of shoes has gone against how far a pair lasts, and how many weeks
 * that leaves at the pace of the last weeks. Most worn first.
 */
const shoeWear = (shoeIds: string[], activities: Activity[], lifeKm: number, now: Date): ShoeWear[] =>
  shoeIds
    .map(id => {
      const runs = activities.filter(({gear_id}) => id === gear_id);
      const distance = runs.reduce((sum, run) => sum + run.distance, 0);
      const recent = runs
        .filter(({start_date}) => now.getTime() - new Date(start_date).getTime() <= PACE_WEEKS * WEEK_MS)
        .reduce((sum, run) => sum + run.distance, 0);
      const life = lifeKm * 1000;
      const pace = recent / PACE_WEEKS;

      return {
        id,
        distance,
        life,
        ratio: distance / life,
        weeksLeft: distance >= life ? 0 : 0 < pace ? (life - distance) / pace : null,
      };
    })
    .sort((first, second) => second.ratio - first.ratio);

export {shoeWear};
export type {ShoeWear};
