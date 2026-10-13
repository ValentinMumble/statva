import {computeExplorerTiles} from './explorer';
import {GetLabel, hasEmoji} from './label';
import {localDay, localYear} from './local-day';
import {DetailedActivity} from './strava';

type ReviewRide = {id: number; name: string; day: string; value: number};

type YearReview = {
  year: number;
  activities: number;
  distance: number;
  movingTime: number;
  biggestDay: {day: string; distance: number; count: number} | null;
  longestRide: ReviewRide | null;
  topBike: {name: string; distance: number; rides: number} | null;
  // Month from 1 to 12.
  bestMonth: {month: number; distance: number} | null;
  emoji: {emoji: string; count: number}[];
  mostKudos: ReviewRide | null;
  first: ReviewRide | null;
  last: ReviewRide | null;
};

// A decoded route with the local day it was ridden on.
type DatedRoute = {day: string; track: number[][]};

const TOP_EMOJI = 5;
const EMOJI = /\p{Extended_Pictographic}/gu;

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

const toRide = (activity: DetailedActivity | undefined, value: number): ReviewRide | null =>
  undefined === activity ? null : {id: activity.id, name: activity.name, day: localDay(activity), value};

// The activity with the highest value; the earliest one wins a tie.
const highest = (
  activities: DetailedActivity[],
  getValue: (activity: DetailedActivity) => number,
): ReviewRide | null => {
  const best = activities.reduce(
    (top: DetailedActivity | undefined, activity) =>
      undefined === top || getValue(activity) > getValue(top) ? activity : top,
    undefined,
  );

  return undefined === best || 0 >= getValue(best) ? null : toRide(best, getValue(best));
};

// Adds a value under a key and returns the key with the biggest total.
const biggestTotal = <Key>(
  activities: DetailedActivity[],
  getKey: (activity: DetailedActivity) => Key | null,
): {key: Key; distance: number; rides: number} | null => {
  const totals = activities.reduce((map: Map<Key, {distance: number; rides: number}>, activity) => {
    const key = getKey(activity);

    if (null === key) return map;

    const entry = map.get(key) ?? {distance: 0, rides: 0};
    map.set(key, {distance: entry.distance + activity.distance, rides: entry.rides + 1});

    return map;
  }, new Map());

  return [...totals.entries()].reduce(
    (best: {key: Key; distance: number; rides: number} | null, [key, entry]) =>
      null === best || entry.distance > best.distance ? {key, ...entry} : best,
    null,
  );
};

// Each emoji counts once per activity name, so "🚲🚲🚲" does not outweigh three rides.
const countEmoji = (names: string[]): YearReview['emoji'] =>
  [
    ...names
      .filter(hasEmoji)
      .flatMap(name => [...new Set(name.match(EMOJI) ?? [])])
      .reduce((map: Map<string, number>, emoji) => map.set(emoji, (map.get(emoji) ?? 0) + 1), new Map())
      .entries(),
  ]
    .map(([emoji, count]) => ({emoji, count}))
    .sort((first, second) => second.count - first.count)
    .slice(0, TOP_EMOJI);

const buildYearReview = (activities: DetailedActivity[], year: number, label: GetLabel): YearReview => {
  const ofYear = activities
    .filter(activity => localYear(activity) === year)
    .sort((first, second) => first.start_date_local.localeCompare(second.start_date_local));
  const rides = ofYear.filter(({sport_type}) => sport_type.includes('Ride'));
  const biggestDay = biggestTotal(ofYear, localDay);
  const topBike = biggestTotal(ofYear, ({gear_id}) => gear_id);
  const bestMonth = biggestTotal(ofYear, activity => Number(localDay(activity).slice(5, 7)));
  const first = ofYear.at(0);
  const last = ofYear.at(-1);

  return {
    year,
    activities: ofYear.length,
    distance: sum(ofYear.map(({distance}) => distance)),
    movingTime: sum(ofYear.map(({moving_time}) => moving_time)),
    biggestDay:
      null === biggestDay || 0 === biggestDay.distance
        ? null
        : {day: biggestDay.key, distance: biggestDay.distance, count: biggestDay.rides},
    longestRide: highest(rides, ({distance}) => distance),
    topBike: null === topBike ? null : {name: label(topBike.key), distance: topBike.distance, rides: topBike.rides},
    bestMonth:
      null === bestMonth || 0 === bestMonth.distance ? null : {month: bestMonth.key, distance: bestMonth.distance},
    emoji: countEmoji(ofYear.map(({name}) => name)),
    mostKudos: highest(ofYear, ({kudos_count}) => kudos_count ?? 0),
    first: toRide(first, first?.distance ?? 0),
    last: toRide(last, last?.distance ?? 0),
  };
};

// Explorer tiles first visited in the year: the tiles of its routes that no earlier
// route had touched. Only the routes up to the end of that year are walked.
const countNewTiles = (routes: DatedRoute[], year: number): number => {
  const tracksOf = (keep: (routeYear: number) => boolean): number[][][] =>
    routes.filter(({day}) => keep(Number(day.slice(0, 4)))).map(({track}) => track);
  const before = new Set(computeExplorerTiles(tracksOf(routeYear => routeYear < year)).tiles.map(tile => tile.join('/')));

  return computeExplorerTiles(tracksOf(routeYear => routeYear === year)).tiles.filter(
    tile => !before.has(tile.join('/')),
  ).length;
};

export {buildYearReview, countNewTiles};
export type {DatedRoute, ReviewRide, YearReview};
