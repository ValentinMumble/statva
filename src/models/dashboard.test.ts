import {buildActivity, buildDetailedActivity} from '../../test/test-util';
import {computeDashboard} from './dashboard';
import {Event} from './event';
import {FTPTest} from './ftp';
import {ActivityType} from './strava';

const label = (key: string | null) => (null === key ? '🤷' : `[${key}]`);

const activities = [
  buildActivity({
    id: 1,
    name: 'N-Peloton #575 G2',
    distance: 60000,
    moving_time: 7200,
    total_elevation_gain: 400,
    kudos_count: 20,
    gear_id: 'b1',
    sport_type: ActivityType.Ride,
    start_date: '2024-03-06T08:00:00Z',
    start_date_local: '2024-03-06T19:00:00Z',
  }),
  buildActivity({
    id: 2,
    name: 'Sortie du dimanche',
    distance: 40000,
    moving_time: 3600,
    total_elevation_gain: 100,
    kudos_count: 5,
    gear_id: 'b2',
    sport_type: ActivityType.Ride,
    start_date: '2025-07-13T06:00:00Z',
    start_date_local: '2025-07-13T08:00:00Z',
  }),
];

const meta = {
  1: buildDetailedActivity({id: 1, calories: 1200, average_temp: 17, device_name: 'Karoo', description: 'Finish Zazou'}),
};

const events: Event[] = [
  {id: 'e1', type: 'chain', date: new Date('2024-01-01'), bike: 'b1', chain: '🍓'},
  {id: 'e2', type: 'chain', date: new Date('2024-06-01'), bike: 'b1', chain: '🍒'},
  {id: 'e3', type: 'battery', date: new Date('2024-06-01'), bike: 'b1'},
];

const ftpTests: FTPTest[] = [
  {id: 'f2', date: new Date('2025-01-01'), ftp: 270, weight: 72},
  {id: 'f1', date: new Date('2024-01-01'), ftp: 250, weight: 75},
];

const build = () => computeDashboard(activities, meta, events, ftpTests, [], label);

test('it totals every activity, not only the ones with cached details', () => {
  const {totals} = build();

  expect(totals.rides).toBe(2);
  expect(totals.distance).toBe(100000);
  expect(totals.elevation).toBe(500);
  expect(totals.kudos).toBe(25);
  expect(totals.metaCount).toBe(1);
  expect(totals.calories).toBe(1200);
});

test('it groups distance by year and by month', () => {
  const {years, months} = build();

  expect(years).toEqual([
    {year: 2024, distance: 60000, elevation: 400, hours: 2, rides: 1},
    {year: 2025, distance: 40000, elevation: 100, hours: 1, rides: 1},
  ]);
  expect(months).toEqual([
    {year: 2024, month: 3, distance: 60000},
    {year: 2025, month: 7, distance: 40000},
  ]);
});

test('it ranks gear by distance and labels it', () => {
  expect(build().gear).toEqual([
    {name: '[b1]', distance: 60000, rides: 1},
    {name: '[b2]', distance: 40000, rides: 1},
  ]);
});

test('it reads start hour and weekday from local time', () => {
  const {startHours, weekdays} = build();

  expect(startHours).toEqual([
    {name: '8h', value: 1},
    {name: '19h', value: 1},
  ]);
  expect(weekdays.find(({name}) => 'Wed' === name)?.value).toBe(1);
  expect(weekdays.find(({name}) => 'Sun' === name)?.value).toBe(1);
});

test('it ranks rides by each measure', () => {
  const {records} = build();
  const longest = records.find(({key}) => 'distance' === key);

  expect(longest?.rides[0]).toEqual({name: 'N-Peloton #575 G2', date: '06/03/2024', value: 60});
  expect(records.find(({key}) => 'calories' === key)?.rides[0].value).toBe(1200);
});

test('it summarises the club rides and where they finished', () => {
  const {npeloton} = build();

  expect(npeloton.rides).toBe(1);
  expect(npeloton.distance).toBe(60000);
  expect(npeloton.groups).toEqual([{name: 'G2', value: 1}]);
  expect(npeloton.finishes).toEqual([{name: 'Zazou', value: 1}]);
});

test('it counts maintenance by labelled type', () => {
  const {maintenance} = build();

  expect(maintenance.total).toBe(3);
  expect(maintenance.byType).toEqual([
    {name: '[chain]', value: 2},
    {name: '[battery]', value: 1},
  ]);
});

test('it orders ftp tests oldest first and derives watts per kilo', () => {
  const {ftp} = build();

  expect(ftp.map(({power}) => power)).toEqual([250, 270]);
  expect(ftp[1].wattsPerKilo).toBe(3.75);
});

test('it works out cost per kilometre against the most used bike', () => {
  const withExpenses = computeDashboard(
    activities,
    meta,
    events,
    ftpTests,
    [{id: 'x', date: new Date('2024-02-01'), amount: 120, description: 'Tyres'}],
    label,
  );

  // 120 euros over the 60 km carried by b1
  expect(withExpenses.spending.centsPerKm).toBe(200);
});

test('it survives an empty archive', () => {
  const empty = computeDashboard([], {}, [], [], [], label);

  expect(empty.totals.rides).toBe(0);
  expect(empty.totals.firstDate).toBeNull();
  expect(empty.spending.centsPerKm).toBeNull();
  expect(empty.years).toEqual([]);
});
