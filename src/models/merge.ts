import {Activity} from './strava';

/**
 * Merging activities recorded in parts (a watch stopped and started again) into one new
 * activity on Strava. The server joins their data; this is what the app shows of it.
 */

// The most activities one merge takes.
const MAX_MERGE_PARTS = 10;

type MergePart = {id: number; name: string; start_date: string};

// A merge Strava refused (as a duplicate of a part, say), kept until its parts are deleted.
type PendingMerge = {
  name: string;
  gearId: string;
  commute: boolean;
  sportType: string;
  parts: MergePart[];
  error: string;
};

type MergeResult =
  | {outcome: 'merged'; activity: Activity; parts: number[]}
  | {outcome: 'refused'; pending: PendingMerge}
  // Strava took the file but was still making it an activity: it shows up a little later.
  | {outcome: 'processing'; parts: number[]};

type MergeChoice = {ids: number[]; name: string; gearId: string; commute: boolean};

// A ride copied to another day and time (or still being made on Strava).
type CopyResult = {outcome: 'copied'; activity: Activity} | {outcome: 'processing'};

// When a copy starts, where the ride was: a day (2026-10-29) and a time (08:05). Left out:
// today, and the time of day the ride started.
type CopyStart = {date?: string; time?: string};

type MergePlan = {
  parts: Activity[];
  distance: number;
  movingTime: number;
  // From the first start to the last end, stops included.
  elapsedTime: number;
  // Seconds stopped between one part and the next.
  gaps: number[];
  overlaps: boolean;
  // Different sports among the parts: the merge takes the first one's.
  mixedSports: boolean;
};

const endOf = ({start_date, elapsed_time}: Activity): number => new Date(start_date).getTime() + elapsed_time * 1000;

/** What a merge of these activities makes: the parts in time order, their totals, the stops between. */
const mergePlan = (activities: Activity[]): MergePlan => {
  const parts = [...activities].sort((first, second) => first.start_date.localeCompare(second.start_date));
  const gaps = parts.slice(1).map((part, index) => (new Date(part.start_date).getTime() - endOf(parts[index])) / 1000);
  const firstStart = 0 === parts.length ? 0 : new Date(parts[0].start_date).getTime();

  return {
    parts,
    distance: parts.reduce((sum, {distance}) => sum + distance, 0),
    movingTime: parts.reduce((sum, {moving_time}) => sum + moving_time, 0),
    elapsedTime: 0 === parts.length ? 0 : (Math.max(...parts.map(endOf)) - firstStart) / 1000,
    gaps,
    overlaps: gaps.some(gap => gap < 0),
    mixedSports: 1 < new Set(parts.map(({sport_type}) => sport_type)).size,
  };
};

export {MAX_MERGE_PARTS, mergePlan};
export type {CopyResult, CopyStart, MergeChoice, MergePart, MergePlan, MergeResult, PendingMerge};
