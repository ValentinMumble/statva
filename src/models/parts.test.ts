import {buildActivity} from '../../test/test-util';
import {computeBikeParts, DEFAULT_PART_RULES, partsCostPerKm, recentFittings, suggestChains} from './parts';
import {Event} from './event';

const BIKE = 'b1';
const label = (key: string | null) => (null === key ? '🤷' : `[${key}]`);

// One ride per day named, so the distance between two dates is exact. The last part
// fitted runs to today, which is well past January, so it picks up every later ride.
const ridesOn = (days: number[], km = 100) =>
  days.map(day =>
    buildActivity({
      id: day,
      gear_id: BIKE,
      distance: km * 1000,
      start_date: `2025-01-${String(day).padStart(2, '0')}T08:00:00Z`,
    }),
  );

const activities = ridesOn([...Array(31).keys()].map(day => day + 1));

const on = (day: number, event: Partial<Event> & {type: Event['type']}): Event =>
  ({id: `${event.type}-${day}`, bike: BIKE, date: new Date(`2025-01-${String(day).padStart(2, '0')}`), ...event}) as Event;

test('it reports nothing for a bike with no events', () => {
  expect(computeBikeParts([], activities, BIKE, label)).toEqual([]);
});

test('it measures a part against how long the previous ones lasted', () => {
  const rides = ridesOn([...Array(20).keys()].map(day => day + 1));
  const events = [on(1, {type: 'battery'}), on(11, {type: 'battery'})];
  const [battery] = computeBikeParts(events, rides, BIKE, label);

  // the first lasted days 1 to 10, and the one fitted now has done days 11 to 20
  expect(battery.expected).toBe(1000000);
  expect(battery.distance).toBe(1000000);
  expect(battery.state).toBe('overdue');
});

test('it calls a part due before it is overdue', () => {
  const rides = ridesOn([...Array(18).keys()].map(day => day + 1));
  const events = [on(1, {type: 'battery'}), on(11, {type: 'battery'})];
  const [battery] = computeBikeParts(events, rides, BIKE, label);

  // 800 km of the 1000 the first one managed
  expect(battery.distance).toBe(800000);
  expect(battery.state).toBe('due');
});

test('it has no expectation for the first of its kind', () => {
  const [battery] = computeBikeParts([on(21, {type: 'battery'})], activities, BIKE, label);

  expect(battery.expected).toBeNull();
  expect(battery.state).toBe('ok');
});

test('it measures a part with a known limit against that, not its past lives', () => {
  // three quick tire changes, which say when they were swapped, not when they wore out
  const rides = ridesOn([...Array(30).keys()].map(day => day + 1), 100);
  const events = [on(1, {type: 'tire'}), on(6, {type: 'tire'}), on(11, {type: 'tire'})];
  const [tire] = computeBikeParts(events, rides, BIKE, label);

  expect(tire.expected).toBe(8000000);
  expect(tire.distance).toBe(2000000);
  expect(tire.state).toBe('ok');
});

test('it measures the chain against the rotation limit, not its past lives', () => {
  const rides = ridesOn([...Array(10).keys()].map(day => day + 1), 50);
  const events = [on(1, {type: 'chain', chain: '🍓'}), on(4, {type: 'chain', chain: '🍒'})];
  const [chain] = computeBikeParts(events, rides, BIKE, label);

  expect(chain.detail).toBe('🍒');
  expect(chain.expected).toBe(400000);
  // days 4 to 10 at 50 km, so 350 of the 400 km stint
  expect(chain.distance).toBe(350000);
  expect(chain.state).toBe('due');
});

test('it puts the part needing attention first', () => {
  const rides = ridesOn([...Array(20).keys()].map(day => day + 1));
  const events = [
    on(1, {type: 'battery'}),
    on(11, {type: 'battery'}),
    on(20, {type: 'chain', chain: '🍒'}),
  ];

  // the battery is at 100% of its expected life, the chain a quarter into its stint
  expect(computeBikeParts(events, rides, BIKE, label).map(({type}) => type)).toEqual(['battery', 'chain']);
});

test('it ignores another bike"s events', () => {
  const events = [{...on(1, {type: 'battery'}), bike: 'b2'} as Event];

  expect(computeBikeParts(events, activities, BIKE, label)).toEqual([]);
});

test('it suggests the least used chain, leaving out the fitted and the retired ones', () => {
  const events = [
    on(1, {type: 'chain', chain: '🍓'}),
    on(6, {type: 'chain', chain: '🍒'}),
    on(8, {type: 'chain', chain: '🍇'}),
    on(11, {type: 'chain', chain: '🍍'}),
    on(21, {type: 'chain', chain: '🍓'}),
  ];

  // 🍒 did 2 days, 🍇 did 3, 🍓 is on the bike, 🍍 is retired
  expect(suggestChains(events, activities, BIKE, ['🍍'])).toEqual([
    {chain: '🍒', distance: 200000},
    {chain: '🍇', distance: 300000},
  ]);
});

test('it offers the last few distinct fittings, newest first', () => {
  const events = [
    on(1, {type: 'tire', brand: 'Pirelli', model: 'P Zero', width: 32}),
    on(11, {type: 'tire', brand: 'Continental', model: 'GP 5000', width: 32}),
    on(21, {type: 'tire', brand: 'Continental', model: 'GP 5000', width: 32}),
  ];

  expect(recentFittings(events, 'tire', BIKE, label).map(({detail}) => detail)).toEqual([
    'Continental GP 5000 32',
    'Pirelli P Zero 32',
  ]);
});

test('it reads the same whatever order the events arrive in', () => {
  const rides = ridesOn([...Array(20).keys()].map(day => day + 1));
  const events = [
    on(1, {type: 'chain', chain: '🍓'}),
    on(11, {type: 'chain', chain: '🍒'}),
    on(16, {type: 'chain', chain: '🍇'}),
  ];
  const shuffled = [events[2], events[0], events[1]];

  const [inOrder] = computeBikeParts(events, rides, BIKE, label);
  const [outOfOrder] = computeBikeParts(shuffled, rides, BIKE, label);

  // the newest chain is the one on the bike, whichever way round they come in
  expect(inOrder.detail).toBe('🍇');
  expect(outOfOrder).toEqual(inOrder);
});

test('the suggested chain does not depend on the order either', () => {
  const rides = ridesOn([...Array(20).keys()].map(day => day + 1));
  const events = [
    on(1, {type: 'chain', chain: '🍓'}),
    on(11, {type: 'chain', chain: '🍒'}),
    on(16, {type: 'chain', chain: '🍇'}),
  ];

  expect(suggestChains([events[2], events[0], events[1]], rides, BIKE)).toEqual(
    suggestChains(events, rides, BIKE),
  );
});

test('a swapped part counts every stint it has been on for, not just the last one', () => {
  const rides = ridesOn([...Array(30).keys()].map(day => day + 1));
  const wide = {type: 'cassette' as const, brand: 'SRAM', model: 'Force', range: '10-36'};
  const close = {type: 'cassette' as const, brand: 'SRAM', model: 'Force', range: '10-30'};
  const events = [on(1, close), on(6, wide), on(11, close), on(21, wide), on(26, close)];
  const [cassette] = computeBikeParts(events, rides, BIKE, label);

  // the 10-30 was on for days 1 to 5, 11 to 20 and 26 onwards: 5 + 10 + 5 days
  expect(cassette.detail).toContain('10-30');
  expect(cassette.distance).toBe(2000000);
  expect(cassette.expected).toBe(30000000);
  expect(cassette.state).toBe('ok');
});

test('the other cassette"s distance stays on the other cassette', () => {
  const rides = ridesOn([...Array(30).keys()].map(day => day + 1));
  const wide = {type: 'cassette' as const, brand: 'SRAM', model: 'Force', range: '10-36'};
  const close = {type: 'cassette' as const, brand: 'SRAM', model: 'Force', range: '10-30'};
  // same events, but the wide one is fitted last
  const [cassette] = computeBikeParts([on(1, close), on(6, wide), on(11, close), on(21, wide)], rides, BIKE, label);

  // the 10-36 was on for days 6 to 10 and 21 onwards: 5 + 10 days
  expect(cassette.detail).toContain('10-36');
  expect(cassette.distance).toBe(1500000);
});

test('a part that is replaced rather than swapped only counts its current fitting', () => {
  const rides = ridesOn([...Array(20).keys()].map(day => day + 1));
  const tire = {type: 'tire' as const, brand: 'Continental', model: 'GP 5000', width: 32};
  const [fitted] = computeBikeParts([on(1, tire), on(11, tire)], rides, BIKE, label);

  // the same model fitted twice is two tires, so only the second one's distance counts
  expect(fitted.distance).toBe(1000000);
  expect(fitted.expected).toBe(8000000);
});

test('it tells how many weeks a part has left at the recent pace on the bike', () => {
  const rides = ridesOn([...Array(20).keys()].map(day => day + 1));
  const [tire] = computeBikeParts([on(11, {type: 'tire'})], rides, BIKE, label, DEFAULT_PART_RULES, new Date('2025-01-21T12:00:00Z'));

  // 2000 km over the last 8 weeks is 250 km a week, and the tire has 7000 of its 8000 km to go
  expect(tire.weeksLeft).toBe(28);
});

test('a part past its life is due now, whatever the pace', () => {
  const rides = ridesOn([...Array(20).keys()].map(day => day + 1));
  const events = [on(1, {type: 'battery'}), on(11, {type: 'battery'})];
  const [battery] = computeBikeParts(events, rides, BIKE, label, DEFAULT_PART_RULES, new Date('2025-01-21T12:00:00Z'));

  expect(battery.weeksLeft).toBe(0);
});

test('it gives no weeks left without recent riding or without a life to measure against', () => {
  const rides = ridesOn([...Array(20).keys()].map(day => day + 1));
  const events = [on(11, {type: 'tire'}), on(11, {type: 'battery'})];
  // months after the last ride, so there is no pace to go on
  const later = computeBikeParts(events, rides, BIKE, label, DEFAULT_PART_RULES, new Date('2025-06-01T12:00:00Z'));
  const soon = computeBikeParts(events, rides, BIKE, label, DEFAULT_PART_RULES, new Date('2025-01-21T12:00:00Z'));

  expect(later.find(({type}) => 'tire' === type)?.weeksLeft).toBeNull();
  // the first battery has no previous one to say how long it lasts
  expect(soon.find(({type}) => 'battery' === type)?.weeksLeft).toBeNull();
});

test('it turns a part"s price and life into a cost per km, and adds them up', () => {
  const events = [on(1, {type: 'tire'}), on(1, {type: 'chain', chain: '🍒'}), on(1, {type: 'battery'})];
  const rules = {...DEFAULT_PART_RULES, pricesEur: {tire: 40, chain: 30, battery: 50}};
  const parts = computeBikeParts(events, activities, BIKE, label, rules);
  const costOf = (type: Event['type']) => parts.find(part => type === part.type)?.costPerKm;

  // 40 € over 8000 km, and 30 € over the 400 km chain stint
  expect(costOf('tire')).toBeCloseTo(0.005);
  expect(costOf('chain')).toBeCloseTo(0.075);
  // a price is no use without a life to spread it over
  expect(costOf('battery')).toBeNull();
  expect(partsCostPerKm(parts)).toBeCloseTo(0.08);
});

test('there is no parts wear cost without any priced part', () => {
  const parts = computeBikeParts([on(1, {type: 'tire'})], activities, BIKE, label);

  expect(parts[0].costPerKm).toBeNull();
  expect(partsCostPerKm(parts)).toBeNull();
});
