import {buildDetailedActivity} from '../../test/test-util';
import {computeDashboard} from './dashboard';
import {Event} from './event';
import {FTPTest} from './ftp';
import {ActivityType} from './strava';

const label = (key: string | null) => (null === key ? '🤷' : `[${key}]`);

const activities = [
  buildDetailedActivity({
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
    average_speed: 8.333,
    calories: 1200,
    average_temp: 17,
    device_name: 'Karoo',
    description: 'Finish Zazou',
    private_note: 'NP: 211',
    kilojoules: 1000,
    elapsed_time: 9000,
    max_speed: 20,
    elev_high: 800,
    athlete_count: 12,
    average_heartrate: 148,
    max_heartrate: 180,
    device_watts: true,
    commute: false,
    trainer: false,
    timezone: '(GMT+01:00) Europe/Paris',
  }),
  buildDetailedActivity({
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
    average_speed: 11.11,
    average_temp: 4,
    calories: 800,
    kilojoules: 600,
    elapsed_time: 4200,
    max_speed: 15,
    elev_high: 200,
    athlete_count: 1,
    average_heartrate: 132,
    max_heartrate: 165,
    device_watts: false,
    commute: true,
    trainer: false,
    timezone: '(GMT+02:00) Europe/Stockholm',
  }),
];

const events: Event[] = [
  {id: 'e1', type: 'chain', date: new Date('2024-01-01'), bike: 'b1', chain: '🍓'},
  {id: 'e2', type: 'chain', date: new Date('2024-06-01'), bike: 'b1', chain: '🍒'},
  {id: 'e3', type: 'battery', date: new Date('2024-06-01'), bike: 'b1'},
];

const ftpTests: FTPTest[] = [
  {id: 'f2', date: new Date('2025-01-01'), ftp: 270, weight: 72},
  {id: 'f1', date: new Date('2024-01-01'), ftp: 250, weight: 75},
];

const build = () => computeDashboard(activities, events, ftpTests, [], label);

test('it totals the cached activities', () => {
  const {totals} = build();

  expect(totals.rides).toBe(2);
  expect(totals.distance).toBe(100000);
  expect(totals.elevation).toBe(500);
  expect(totals.kudos).toBe(25);
  expect(totals.calories).toBe(2000);
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

test('it ranks rides by each measure and formats the winner', () => {
  const {records} = build();
  const longest = records.find(({key}) => 'distance' === key);

  expect(longest?.rides[0]).toEqual({id: 1, name: 'N-Peloton #575 G2', date: '06/03/2024', value: 60, label: '60 km'});
  expect(records.find(({key}) => 'hilliest' === key)?.rides[0].label).toBe('6,7 m/km');
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
    events,
    ftpTests,
    [{id: 'x', date: new Date('2024-02-01'), amount: 120, description: 'Tyres'}],
    label,
  );

  // 120 euros over the 60 km carried by b1
  expect(withExpenses.spending.centsPerKm).toBe(200);
});

test('it survives an empty archive', () => {
  const empty = computeDashboard([], [], [], [], label);

  expect(empty.totals.rides).toBe(0);
  expect(empty.totals.firstDate).toBeNull();
  expect(empty.spending.centsPerKm).toBeNull();
  expect(empty.years).toEqual([]);
});

test('it adds up the work done and the kit used', () => {
  const {totals} = build();

  expect(totals.kilojoules).toBe(1600);
  expect(totals.withPowerMeter).toBe(1);
  expect(totals.commutes).toBe(1);
  expect(totals.solo).toBe(1);
  expect(totals.maxHeartRate).toBe(180);
});

test('it takes the middle stop, so a ride left paused does not skew it', () => {
  // gaps are 1800s and 600s, plus a fake 10h one that must not move the figure
  const withPausedRide = computeDashboard(
    [...activities, buildDetailedActivity({id: 3, moving_time: 3600, elapsed_time: 3600 + 36000})],
    events,
    ftpTests,
    [],
    label,
  );

  expect(withPausedRide.totals.medianStopMinutes).toBe(30);
});

test('it ranks the fastest average, the earliest start and the most crowded ride', () => {
  const {records} = build();

  // 60 km in two hours, and only rides of 50 km or more count for speed
  const [fastest, ...otherFast] = records.find(({key}) => 'speed' === key)?.rides ?? [];
  expect(otherFast).toEqual([]);
  expect(fastest.name).toBe('N-Peloton #575 G2');
  expect(fastest.value).toBeCloseTo(30, 2);
  expect(fastest.label).toBe('30,0 km/h');
  expect(records.find(({key}) => 'earliest' === key)?.rides[0].label).toBe('08:00');
  expect(records.find(({key}) => 'company' === key)?.rides).toEqual([
    {id: 1, name: 'N-Peloton #575 G2', date: '06/03/2024', value: 12, label: '12 riders'},
  ]);
});

test('it puts the coldest ride first and the hottest ride first in their own cards', () => {
  const {records} = build();

  expect(records.find(({key}) => 'coldest' === key)?.rides[0].name).toBe('Sortie du dimanche');
  expect(records.find(({key}) => 'hottest' === key)?.rides[0].name).toBe('N-Peloton #575 G2');
});

test('it groups heart rate into bands', () => {
  const {conditions} = build();

  expect(conditions.heartRates).toEqual([
    {name: '130 bpm', value: 1},
    {name: '140 bpm', value: 1},
  ]);
});

test('it measures days out and the longest run of consecutive days', () => {
  const backToBack = [
    buildDetailedActivity({id: 10, start_date: '2024-05-01T08:00:00Z', start_date_local: '2024-05-01T10:00:00Z'}),
    buildDetailedActivity({id: 11, start_date: '2024-05-02T08:00:00Z', start_date_local: '2024-05-02T10:00:00Z'}),
    buildDetailedActivity({id: 12, start_date: '2024-05-03T08:00:00Z', start_date_local: '2024-05-03T10:00:00Z'}),
    // same day as the one before, so it must not extend the streak
    buildDetailedActivity({id: 13, start_date: '2024-05-03T16:00:00Z', start_date_local: '2024-05-03T18:00:00Z'}),
    buildDetailedActivity({id: 14, start_date: '2024-06-20T08:00:00Z', start_date_local: '2024-06-20T10:00:00Z'}),
  ];
  const {totals} = computeDashboard(backToBack, [], [], [], label);

  expect(totals.activeDays).toBe(4);
  expect(totals.longestStreak).toBe(3);
});

test('it builds a running weekly total per year', () => {
  const {yearProgress} = build();

  expect(yearProgress.years).toEqual([2024, 2025]);
  expect(yearProgress.rows).toHaveLength(53);

  // the 2024 ride lands in the tenth week and the total holds for the rest of the year
  expect(yearProgress.rows[9]['2024']).toBe(60);
  expect(yearProgress.rows[52]['2024']).toBe(60);
});

test('it stops the year in progress where the riding stops', () => {
  const {yearProgress} = build();
  const lastYear = String(yearProgress.years[yearProgress.years.length - 1]);

  // the 2025 ride lands in week 27, so that week carries the total and later weeks stay empty
  expect(yearProgress.rows[27][lastYear]).toBe(40);
  expect(yearProgress.rows[28][lastYear]).toBeNull();
  expect(yearProgress.rows[52][lastYear]).toBeNull();
});

test('it finds the biggest week and month', () => {
  const {totals} = build();

  expect(totals.biggestWeek).toBe(60);
  expect(totals.biggestMonth).toBe(60);
});

test('it leaves ski out of the records, where it would take every altitude', () => {
  const withSki = [
    ...activities,
    buildDetailedActivity({
      id: 20,
      name: 'Les Menuires jour 2',
      sport_type: 'AlpineSki' as ActivityType,
      total_elevation_gain: 9000,
      max_speed: 25,
      distance: 30000,
      start_date: '2025-02-10T09:00:00Z',
      start_date_local: '2025-02-10T10:00:00Z',
    }),
  ];
  const {records, totals} = computeDashboard(withSki, [], [], [], label);

  // the ski day has the most metres gained by far, and must not appear
  expect(records.find(({key}) => 'elevation' === key)?.rides.map(({name}) => name)).not.toContain('Les Menuires jour 2');
  // it still counts towards the totals, it is only kept out of the records
  expect(totals.rides).toBe(3);
});

test('it works out the eddington number from rides only', () => {
  // three days of 60 km and one of 40 km gives an eddington of 3
  const {totals} = computeDashboard(
    [
      buildDetailedActivity({id: 30, distance: 60000, start_date: '2024-04-01T08:00:00Z', start_date_local: '2024-04-01T10:00:00Z'}),
      buildDetailedActivity({id: 31, distance: 60000, start_date: '2024-04-02T08:00:00Z', start_date_local: '2024-04-02T10:00:00Z'}),
      buildDetailedActivity({id: 32, distance: 60000, start_date: '2024-04-03T08:00:00Z', start_date_local: '2024-04-03T10:00:00Z'}),
    ],
    [],
    [],
    [],
    label,
  );

  expect(totals.eddington).toBe(3);
});

test('it says how many more days the next eddington level needs', () => {
  // three days of 60 km: E is 3, and E4 needs four days of 4 km or more, so one is missing
  const {eddingtonNext} = computeDashboard(
    [
      buildDetailedActivity({id: 30, distance: 60000, start_date: '2024-04-01T08:00:00Z', start_date_local: '2024-04-01T10:00:00Z'}),
      buildDetailedActivity({id: 31, distance: 60000, start_date: '2024-04-02T08:00:00Z', start_date_local: '2024-04-02T10:00:00Z'}),
      buildDetailedActivity({id: 32, distance: 60000, start_date: '2024-04-03T08:00:00Z', start_date_local: '2024-04-03T10:00:00Z'}),
    ],
    [],
    [],
    [],
    label,
  );

  expect(eddingtonNext).toEqual({target: 4, have: 3, needed: 1});
});

test('it ranks strength by the logged normalized power, so estimated running power does not count', () => {
  const withRun = [
    ...activities,
    buildDetailedActivity({
      id: 40,
      name: 'Trail du Haras',
      sport_type: 'TrailRun' as ActivityType,
      moving_time: 5400,
      weighted_average_watts: 270,
      private_note: '',
      start_date: '2025-03-01T09:00:00Z',
      start_date_local: '2025-03-01T10:00:00Z',
    }),
  ];
  const strongest = computeDashboard(withRun, [], [], [], label).records.find(({key}) => 'power' === key);

  expect(strongest?.rides).toEqual([{id: 1, name: 'N-Peloton #575 G2', date: '06/03/2024', value: 211, label: '211 W'}]);
});
