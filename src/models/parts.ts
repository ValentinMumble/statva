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
type PartRules = {limitsKm: Partial<Record<Event['type'], number>>; retiredChains: string[]};

const DEFAULT_PART_RULES: PartRules = {limitsKm: {chain: 400, tire: 8000, cassette: 30000}, retiredChains: []};

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
};

type Fitting = {event: Event; detail: string};

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

const distanceBetween = (activities: Activity[], from: Date, to?: Date): number =>
  sum(getRidesBetween(activities, from, to).map(({distance}) => distance));

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

/**
 * What is fitted right now and how far it has gone, measured against the part's known
 * limit where there is one, and otherwise against how long the previous ones lasted on
 * this bike.
 */
const partStatus = (
  type: Event['type'],
  events: Event[],
  activities: Activity[],
  bikeId: string,
  label: GetLabel,
  rules: PartRules,
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
  };
};

const computeBikeParts = (
  events: Event[],
  activities: Activity[],
  bikeId: string,
  label: GetLabel,
  rules: PartRules = DEFAULT_PART_RULES,
): PartStatus[] =>
  WEARING_PARTS.map(type => partStatus(type, events, activities, bikeId, label, rules))
    .filter((part): part is PartStatus => null !== part)
    .sort((a, b) => b.ratio - a.ratio);

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
  const fittings = onBike(events, bikeId, 'chain').filter(isChainEvent);
  const current = fittings.at(-1)?.chain;

  const totals = fittings.reduce((totals: Record<string, number>, event, index) => {
    totals[event.chain] = (totals[event.chain] ?? 0) + distanceBetween(activities, event.date, fittings[index + 1]?.date);

    return totals;
  }, {});

  return Object.entries(totals)
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

export {computeBikeParts, DEFAULT_PART_RULES, recentFittings, REFITTED_PARTS, rotationLimit, suggestChains, WEARING_PARTS};
export type {Fitting, PartRules, PartState, PartStatus};
