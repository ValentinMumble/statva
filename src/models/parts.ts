import {getRidesBetween} from './activity-stats';
import {Event, getEventLabel, isChainEvent} from './event';
import {GetLabel} from './label';
import {Activity} from './strava';

/**
 * A rider's rules for their parts (settings). Limits are how long a part should last,
 * where that is a known figure rather than something to infer: the history says when a
 * part was swapped, which is not when it wore out, so for these it would read far too
 * short. Parts without a limit fall back on history. A chain's limit is per stint.
 */
type PartRules = {
  limitsKm: Partial<Record<Event['type'], number>>;
  retiredChains: string[];
  // What one replacement costs, in euros, to turn a part's life into a cost per km.
  pricesEur: Partial<Record<Event['type'], number>>;
};

const DEFAULT_PART_RULES: PartRules = {limitsKm: {chain: 400, tire: 8000, cassette: 30000}, retiredChains: [], pricesEur: {}};

// A chain comes off the bike once it has done this much on its current stint.
const rotationLimit = (rules: PartRules = DEFAULT_PART_RULES): number => (rules.limitsKm.chain ?? 400) * 1000;

// Parts you own several of and swap between, so what one has done is the sum of every
// time it has been on the bike, not the stint it is on now. A chain is not one of these:
// its limit is about the current stint, which is when it comes off to rest.
const ROTATED_PARTS: Event['type'][] = ['cassette'];

// Parts that wear out with distance. Saddles, falls and punctures are not on a schedule.
const WEARING_PARTS: Event['type'][] = ['chain', 'tire', 'cassette', 'brake_pad', 'brake_bleed', 'battery'];
// Parts you refit the same model of, so the last few are worth offering again.
const REFITTED_PARTS: Event['type'][] = ['tire', 'cassette', 'saddle'];
const DUE_RATIO = 0.8;
const DAY = 24 * 60 * 60 * 1000;
// The recent riding pace is read over this many weeks: long enough to smooth out a rainy
// week, short enough to follow a change of season.
const PACE_WEEKS = 8;

type PartState = 'ok' | 'due' | 'overdue';

type PartStatus = {
  type: Event['type'];
  name: string;
  detail: string;
  fittedOn: Date;
  distance: number;
  expected: number | null;
  ratio: number;
  state: PartState;
  // At the recent pace on this bike; 0 when it is due now, null without a life or recent riding.
  weeksLeft: number | null;
  // In euros per km, from its price and expected life; null without either.
  costPerKm: number | null;
};

type Fitting = {event: Event; detail: string};

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

const distanceBetween = (activities: Activity[], from: Date, to?: Date): number =>
  sum(getRidesBetween(activities, from, to).map(({distance}) => distance));

// Km per week over the last few weeks, today included.
const recentPace = (activities: Activity[], now: Date): number => {
  const tomorrow = new Date(now.getTime() + DAY);

  return distanceBetween(activities, new Date(tomorrow.getTime() - PACE_WEEKS * 7 * DAY), tomorrow) / PACE_WEEKS;
};

const weeksLeftOf = (distance: number, expected: number | null, pace: number): number | null => {
  if (null === expected || 0 >= expected) return null;
  if (distance >= expected) return 0;

  return 0 < pace ? (expected - distance) / pace : null;
};

const costPerKmOf = (price: number | undefined, expected: number | null): number | null =>
  undefined === price || 0 >= price || null === expected || 0 >= expected ? null : price / (expected / 1000);

const stateOf = (distance: number, expected: number | null): PartState => {
  if (null === expected || 0 >= expected) return 'ok';
  if (distance >= expected) return 'overdue';

  return distance >= expected * DUE_RATIO ? 'due' : 'ok';
};

// Oldest first, so the last one is what is fitted now. Sorted here rather than trusted
// from the caller: out of order, every reading silently comes out of the wrong fitting.
const onBike = (events: Event[], bikeId: string, type: Event['type']): Event[] =>
  events
    .filter(event => bikeId === event.bike && type === event.type)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

/** Every chain's total on this bike, over all its stints. */
const chainTotals = (events: Event[], activities: Activity[], bikeId: string): Record<string, number> => {
  const fittings = onBike(events, bikeId, 'chain').filter(isChainEvent);

  return fittings.reduce((totals: Record<string, number>, event, index) => {
    totals[event.chain] = (totals[event.chain] ?? 0) + distanceBetween(activities, event.date, fittings[index + 1]?.date);

    return totals;
  }, {});
};

/**
 * How far a chain goes in all: the average of the retired ones on this bike. A chain's
 * limit is one stint of a rotation, so its price is spread over this instead.
 */
const chainLife = (events: Event[], activities: Activity[], bikeId: string, retiredChains: string[]): number | null => {
  const lives = Object.entries(chainTotals(events, activities, bikeId))
    .filter(([chain, distance]) => retiredChains.includes(chain) && 0 < distance)
    .map(([, distance]) => distance);

  return 0 === lives.length ? null : sum(lives) / lives.length;
};

/**
 * What is fitted right now and how far it has gone, measured against the part's known
 * limit where there is one, and otherwise against how long the previous ones lasted on
 * this bike. The activities are this bike's rides, so the pace is this bike's too.
 */
const partStatus = (
  type: Event['type'],
  events: Event[],
  activities: Activity[],
  bikeId: string,
  label: GetLabel,
  rules: PartRules,
  pace: number,
): PartStatus | null => {
  const fittings = onBike(events, bikeId, type);
  const current = fittings.at(-1);

  if (undefined === current) return null;

  const stints = fittings.map((event, index) => ({
    event,
    distance: distanceBetween(activities, event.date, fittings[index + 1]?.date),
  }));
  const fittedNow = getEventLabel(current, label);
  const distance = ROTATED_PARTS.includes(type)
    ? sum(stints.filter(({event}) => getEventLabel(event, label) === fittedNow).map(({distance}) => distance))
    : (stints.at(-1)?.distance ?? 0);

  const previousLives = stints
    .slice(0, -1)
    .map(({distance}) => distance)
    .filter(life => 0 < life);
  const limitKm = rules.limitsKm[type];
  const expected =
    undefined !== limitKm && 0 < limitKm
      ? limitKm * 1000
      : 0 === previousLives.length
        ? null
        : sum(previousLives) / previousLives.length;
  const detail = getEventLabel(current, label, true);

  return {
    type,
    name: label(type),
    detail: detail === label(type) ? '' : detail,
    fittedOn: current.date,
    distance,
    expected,
    ratio: null === expected || 0 >= expected ? 0 : distance / expected,
    state: stateOf(distance, expected),
    weeksLeft: weeksLeftOf(distance, expected, pace),
    costPerKm: costPerKmOf(rules.pricesEur[type], 'chain' === type ? chainLife(events, activities, bikeId, rules.retiredChains) : expected),
  };
};

const computeBikeParts = (
  events: Event[],
  activities: Activity[],
  bikeId: string,
  label: GetLabel,
  rules: PartRules = DEFAULT_PART_RULES,
  now: Date = new Date(),
): PartStatus[] => {
  const pace = recentPace(activities, now);

  return WEARING_PARTS.map(type => partStatus(type, events, activities, bikeId, label, rules, pace))
    .filter((part): part is PartStatus => null !== part)
    .sort((a, b) => b.ratio - a.ratio);
};

/** What the parts cost to wear out, in euros per km, over those with a price and a life. */
const partsCostPerKm = (parts: PartStatus[]): number | null => {
  const costs = parts.map(({costPerKm}) => costPerKm).filter((cost): cost is number => null !== cost);

  return 0 === costs.length ? null : sum(costs);
};

/**
 * Which chain to fit next: the least used of the set, so they wear down together. The one
 * on the bike and the retired ones are out.
 */
const suggestChains = (
  events: Event[],
  activities: Activity[],
  bikeId: string,
  retiredChains: string[] = [],
): {chain: string; distance: number}[] => {
  const current = onBike(events, bikeId, 'chain').filter(isChainEvent).at(-1)?.chain;

  return Object.entries(chainTotals(events, activities, bikeId))
    .filter(([chain]) => chain !== current && !retiredChains.includes(chain))
    .map(([chain, distance]) => ({chain, distance}))
    .sort((a, b) => a.distance - b.distance);
};

/** The last few distinct things fitted of a type, newest first, to offer them again. */
const recentFittings = (
  events: Event[],
  type: Event['type'],
  bikeId: string,
  label: GetLabel,
  limit = 3,
): Fitting[] => {
  const seen = new Set<string>();

  return [...onBike(events, bikeId, type)]
    .reverse()
    .map(event => ({event, detail: getEventLabel(event, label)}))
    .filter(({detail}) => {
      if ('' === detail.trim() || seen.has(detail)) return false;

      seen.add(detail);

      return true;
    })
    .slice(0, limit);
};

export {computeBikeParts, DEFAULT_PART_RULES, partsCostPerKm, recentFittings, REFITTED_PARTS, rotationLimit, suggestChains, WEARING_PARTS};
export type {Fitting, PartRules, PartState, PartStatus};
