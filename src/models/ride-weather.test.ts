import {buildActivity} from '../../test/test-util';
import {ActivityType} from './strava';
import {
  betterStart,
  elevationProfile,
  gradeAlong,
  forecastAt,
  heading,
  headwindOf,
  HourForecast,
  isLoop,
  outfit,
  progressAt,
  rainSpell,
  reversePoints,
  rideSky,
  routeFromPoints,
  sampleIndexes,
  speedInWind,
  startOptions,
  timeline,
  usualPace,
  weatherAlong,
  WeatherPoint,
  weatherReversed,
  windCost,
  windShares,
} from './ride-weather';

const now = new Date('2026-11-06T12:00:00Z');
const HOUR = 3600000;
const hour = (time: number, values: Partial<HourForecast> = {}): HourForecast => ({
  time,
  temperature: 10,
  feelsLike: 8,
  rainChance: 0,
  rain: 0,
  cloud: 50,
  wind: 20,
  gust: 30,
  windFrom: 0,
  ...values,
});

describe('routeFromPoints', () => {
  it('works out the distance along the route when the source has none', () => {
    // A thousandth of a degree of latitude is about 111 m.
    const route = routeFromPoints(
      [
        [45, 5],
        [45.001, 5],
        [45.002, 5],
      ],
      [100, 110, 105],
    );

    expect(route.map(({distance}) => Math.round(distance))).toEqual([0, 111, 222]);
    expect(route[1]).toMatchObject({lat: 45.001, altitude: 110});
  });
});

describe('reversePoints', () => {
  it('starts from the finish, counting the distance from there', () => {
    const route = routeFromPoints(
      [
        [45, 5],
        [45.001, 5],
        [45.003, 5],
      ],
      [100, 110, 150],
    );

    expect(reversePoints(route).map(({distance, altitude}) => [Math.round(distance), altitude])).toEqual([
      [0, 150],
      [222, 110],
      [334, 100],
    ]);
  });
});

describe('heading and wind', () => {
  it('turns the wind into head or tail wind along the way', () => {
    expect(Math.round(heading({lat: 45, lng: 5}, {lat: 45.1, lng: 5}))).toBe(0);
    expect(Math.round(heading({lat: 45, lng: 5}, {lat: 45, lng: 5.1}))).toBe(90);
    // Riding north into a north wind, then away from it, then across it.
    expect(headwindOf(20, 0, 0)).toBeCloseTo(20);
    expect(headwindOf(20, 0, 180)).toBeCloseTo(-20);
    expect(headwindOf(20, 90, 0)).toBeCloseTo(0);
  });
});

describe('usualPace', () => {
  const ride = (km: number, climb: number, hours: number, values = {}) =>
    buildActivity({
      sport_type: ActivityType.Ride,
      trainer: false,
      distance: km * 1000,
      total_elevation_gain: climb,
      moving_time: hours * 3600,
      start_date: '2026-09-01T08:00:00Z',
      ...values,
    });

  it('fits a flat pace and a cost per metre climbed from rides of about the same length', () => {
    // 30 km/h on the flat, and 6 minutes more per 100 m climbed.
    const rides = [
      [60, 0],
      [80, 500],
      [100, 1000],
      [90, 200],
      [70, 800],
    ].map(([km, climb]) => ride(km, climb, km / 30 + climb / 1000));
    const pace = usualPace(rides, 80000, now);

    expect(3.6 / (pace?.secondsPerMetre ?? 0)).toBeCloseTo(30);
    expect((pace?.secondsPerMetreClimbed ?? 0) * 100).toBeCloseTo(360);
  });

  it('leaves out indoor and old rides, and has no pace without enough rides', () => {
    const rides = [
      ...Array.from({length: 4}, () => ride(50, 300, 2)),
      ride(50, 0, 1, {trainer: true}),
      ride(50, 0, 1, {sport_type: ActivityType.VirtualRide}),
      ride(50, 0, 1, {start_date: '2023-01-01T08:00:00Z'}),
    ];

    expect(usualPace(rides, 50000, now)).toBeNull();
  });
});

describe('gradeAlong', () => {
  it('reads the slope over 100 m either side', () => {
    // Flat for 300 m, then 10 % up for 300 m, every 50 m.
    const points = Array.from({length: 13}, (_, step) => ({
      distance: step * 50,
      altitude: step <= 6 ? 0 : (step - 6) * 5,
    }));
    const grades = gradeAlong(points);

    expect(grades[0]).toBe(0);
    expect(grades[12]).toBeCloseTo(0.1);
    expect(grades[6]).toBeGreaterThan(0);
    expect(grades[6]).toBeLessThan(0.1);
  });
});

describe('progressAt', () => {
  // 3 km due north, one point a km, a km every 3 minutes.
  const points = [0, 1, 2, 3].map(km => ({lat: 47 + km * 0.009, lng: 0, altitude: 0, distance: km * 1000}));
  const times = [0, 180, 360, 540];
  const start = Date.parse('2026-11-11T10:00:00Z');

  it('finds the nearest point and how the moment compares with the plan', () => {
    const progress = progressAt(points, times, start, {lat: 47.018, lng: 0}, start + 7 * 60000);

    expect(progress?.distance).toBe(2000);
    expect(progress?.offRoute).toBe(false);
    // planned there at 6 min, there at 7: a minute behind
    expect(progress?.behind).toBe(60);
  });

  it('says when the rider is off the route', () => {
    const progress = progressAt(points, times, start, {lat: 47.009, lng: 0.01}, start);

    expect(progress?.offRoute).toBe(true);
    expect(progress?.away).toBeGreaterThan(700);
    expect(progressAt([], [], start, {lat: 47, lng: 0}, start)).toBeNull();
  });
});

describe('elevationProfile', () => {
  it('keeps every point of a short route, with the time the rider gets there', () => {
    const points = [0, 100, 200].map(distance => ({lat: 47, lng: -1, altitude: distance / 10, distance}));

    expect(elevationProfile(points, [0, 20, 40], 1000).map(({time, altitude}) => [time, altitude])).toEqual([
      [1000, 0],
      [21000, 10],
      [41000, 20],
    ]);
  });

  it('keeps the peaks of a long route', () => {
    // 100 km every 10 m, flat but for one sharp 40 m bump at km 50.
    const points = Array.from({length: 10001}, (_, step) => ({
      lat: 47,
      lng: -1,
      altitude: 5000 === step ? 140 : 100,
      distance: step * 10,
    }));
    const profile = elevationProfile(
      points,
      points.map((_, step) => step),
      0,
    );

    expect(profile.length).toBeLessThanOrEqual(602);
    expect(Math.max(...profile.map(({altitude}) => altitude))).toBe(140);
    expect(profile[0].distance).toBe(0);
    expect(profile.at(-1)?.distance).toBe(100000);
    expect(profile.every((point, index) => 0 === index || profile[index - 1].distance < point.distance)).toBe(true);
  });
});

describe('the weather along a route', () => {
  // 20 km due north, climbing 100 m in the second half.
  const route = routeFromPoints(
    Array.from({length: 21}, (_, index): [number, number] => [45 + index * 0.009, 5]),
    Array.from({length: 21}, (_, index) => (index <= 10 ? 0 : (index - 10) * 10)),
  );
  const pace = {secondsPerMetre: 0.12, secondsPerMetreClimbed: 3.6};

  it('takes longer over the climbs', () => {
    const times = timeline(route, pace);

    // 30 km/h on the flat for the first 10 km: 20 minutes.
    expect(Math.round(times[10] / 60)).toBe(20);
    // The same again, plus 6 minutes for the 100 m climbed.
    expect(Math.round((times[20] - times[10]) / 60)).toBe(26);
  });

  it('asks for the forecast every few km, start and finish included', () => {
    const indexes = sampleIndexes(route);

    expect(indexes[0]).toBe(0);
    expect(indexes.at(-1)).toBe(20);
    // Just over 20 km, so a point every 3.3 km or so.
    expect(indexes).toEqual([0, 4, 7, 10, 14, 17, 20]);
    // No route yet, nothing to ask for.
    expect(sampleIndexes([])).toEqual([]);
  });

  it('reads the forecast between hours, at the time the rider gets there', () => {
    const start = Date.parse('2026-11-08T09:00:00Z');
    const hours = [hour(start, {temperature: 6}), hour(start + HOUR, {temperature: 12, windFrom: 180})];

    expect(forecastAt(hours, start + HOUR / 2)?.temperature).toBe(9);
    expect(forecastAt(hours, start + HOUR / 4)?.windFrom).toBe(0);
    expect(forecastAt(hours, start + 2 * HOUR)).toBeNull();

    const times = timeline(route, pace);
    const weather = weatherAlong(route, times, start, [0, 20], [hours, hours]);
    // Heading north into the 20 km/h north wind at the start; 46 minutes later, nearly the south wind.
    expect(weather[0].headwind).toBeCloseTo(20);
    expect(weather[1].headwind).toBeCloseTo(-20);
    expect(windShares(weather)).toEqual({head: 0.5, tail: 0.5});
  });
});

describe('what the weather means for the ride', () => {
  const start = Date.parse('2026-11-08T09:00:00Z');
  const point = (distance: number, minutes: number, values: Partial<WeatherPoint> = {}): WeatherPoint => ({
    ...hour(start, values),
    lat: 45,
    lng: 5,
    altitude: 0,
    distance,
    time: start + minutes * 60000,
    heading: 0,
    headwind: 0,
    ...values,
  });

  it('costs time into the wind and saves less of it with the wind behind', () => {
    // 30 km/h without wind.
    expect(speedInWind(30 / 3.6, 0) * 3.6).toBeCloseTo(30);
    const into = speedInWind(30 / 3.6, 20 / 3.6) * 3.6;
    const behind = speedInWind(30 / 3.6, -20 / 3.6) * 3.6;
    expect(into).toBeLessThan(24);
    expect(behind).toBeGreaterThan(36);

    // 30 km in an hour, into a 20 km/h wind, then with it behind.
    const head = windCost([point(0, 0, {headwind: 20}), point(30000, 60)]);
    const tail = windCost([point(0, 0, {headwind: -20}), point(30000, 60)]);
    expect(head / 60).toBeGreaterThan(10);
    expect(tail).toBeLessThan(0);
    expect(-tail).toBeLessThan(head);

    // The same ride with half an hour of stops spread along it: the riding speed is the same.
    expect(windCost([point(0, 0, {headwind: 20}), point(30000, 90)], 60 / 90)).toBeCloseTo(head);
  });

  it('finds a start with less wind or rain, and keeps quiet when the chosen one is as good', () => {
    const chosen = {start, windCost: 900, rainChance: 10};
    const calmer = {start: start + 2 * HOUR, windCost: 300, rainChance: 10};
    const wetter = {start: start - HOUR, windCost: 0, rainChance: 90};

    expect(betterStart([wetter, chosen, calmer], start)).toBe(calmer);
    expect(betterStart([chosen, {...calmer, windCost: 800}], start)).toBeNull();
  });

  it('tries the start a few hours either side, as far as the forecast goes', () => {
    const route = routeFromPoints(
      [
        [45, 5],
        [45.09, 5],
      ],
      [0, 0],
    );
    const times = timeline(route, {secondsPerMetre: 0.12, secondsPerMetreClimbed: 0});
    const hours = Array.from({length: 6}, (_, index) => hour(start + (index - 1) * HOUR, {windFrom: 0}));

    // The forecast runs from an hour before the start to four after: -1 to +3 fit, minus the last.
    expect(
      startOptions(route, times, start, [0, 1], [hours, hours]).map(option => (option.start - start) / HOUR),
    ).toEqual([-1, 0, 1, 2, 3]);
  });

  it('knows a loop, and rides it the other way at the same places', () => {
    const loop = routeFromPoints(
      [
        [45, 5],
        [45.05, 5],
        [45.0005, 5],
      ],
      [0, 0, 0],
    );
    expect(isLoop(loop)).toBe(true);
    expect(isLoop(loop.slice(0, 2))).toBe(false);

    const north = [hour(start, {windFrom: 0}), hour(start + 4 * HOUR, {windFrom: 0})];
    const south = [hour(start, {windFrom: 180}), hour(start + 4 * HOUR, {windFrom: 180})];
    const pace = {secondsPerMetre: 0.12, secondsPerMetreClimbed: 0};
    const reversed = weatherReversed(loop, pace, start, [0, 1, 2], [north, north, south]);

    // The way back now comes first: it starts at the last place, heading north into the wind.
    expect(reversed.map(({lat}) => lat)).toEqual([45.0005, 45.05, 45]);
    expect(reversed[0].windFrom).toBe(180);
  });

  it('says where rain is likely, and what to wear', () => {
    const dry = [point(0, 0, {feelsLike: 12}), point(20000, 40, {feelsLike: 14})];
    const wet = [point(0, 0, {feelsLike: 3}), point(20000, 40, {rainChance: 60}), point(40000, 80, {rain: 0.5})];

    expect(rainSpell(dry)).toBeNull();
    expect(rainSpell(wet)).toMatchObject({from: {distance: 20000}, to: {distance: 40000}});
    expect(outfit(dry)).toBe('Long sleeves or arm warmers, knee warmers.');
    expect(outfit(wet)).toBe('Winter jacket, thermal tights, warm gloves and overshoes, a rain jacket.');
  });

  it('sums up the ride as one emoji: rain, then wind, then clouds', () => {
    const along = (values: Partial<WeatherPoint>) => [0, 1, 2, 3].map(step => point(step * 5000, step * 10, values));

    expect(rideSky([])).toBeNull();
    expect(rideSky(along({rainChance: 80, rain: 2}))).toEqual({emoji: '🌧️', label: 'Rain'});
    expect(rideSky([...along({cloud: 0}), point(20000, 40, {rainChance: 60})])?.emoji).toBe('🌦️');
    expect(rideSky(along({wind: 35, cloud: 0}))?.emoji).toBe('💨');
    expect(rideSky(along({cloud: 90}))?.emoji).toBe('☁️');
    expect(rideSky(along({cloud: 40}))).toEqual({emoji: '⛅', label: 'Partly cloudy'});
    expect(rideSky(along({cloud: 0}))?.emoji).toBe('☀️');
  });
});
