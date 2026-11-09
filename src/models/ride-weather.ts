import {isPedalled} from './activity-meta';
import {Activity} from './strava';

/**
 * The weather along a planned route, as Epic Ride Weather shows it: when the rider reaches
 * each part of the route at their own pace, and the forecast there at that moment, with the
 * wind turned into head or tail wind for the way they ride.
 */

type RoutePoint = {lat: number; lng: number; altitude: number; distance: number};
// Where the route comes from: the route or tour on Strava or Komoot.
type RouteSource = {service: 'strava' | 'komoot'; url: string};
type PlannedRoute = {name: string; points: RoutePoint[]; source?: RouteSource};

// The rider's pace: seconds per metre on the flat, and seconds more per metre climbed.
type Pace = {secondsPerMetre: number; secondsPerMetreClimbed: number};

// One hour of forecast at a place, as Open-Meteo gives it (km/h, degrees the wind comes from).
type HourForecast = {
  time: number;
  temperature: number;
  feelsLike: number;
  rainChance: number;
  rain: number;
  cloud: number;
  wind: number;
  gust: number;
  windFrom: number;
};

type WeatherPoint = Omit<HourForecast, 'time'> &
  RoutePoint & {
    time: number;
    // Along the way the rider goes: positive is a headwind, negative a tailwind (km/h).
    headwind: number;
    heading: number;
  };

// Open-Meteo forecasts 16 days ahead.
const FORECAST_DAYS = 16;

const EARTH_RADIUS = 6371000;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** The distance between two points in metres. */
const haversine = (from: {lat: number; lng: number}, to: {lat: number; lng: number}): number => {
  const latitude = radians(to.lat - from.lat);
  const longitude = radians(to.lng - from.lng);
  const chord =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitude / 2) ** 2;

  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(chord));
};

/** The compass heading from one point to the next, in degrees (0 north, 90 east). */
const heading = (from: {lat: number; lng: number}, to: {lat: number; lng: number}): number => {
  const longitude = radians(to.lng - from.lng);
  const east = Math.sin(longitude) * Math.cos(radians(to.lat));
  const north =
    Math.cos(radians(from.lat)) * Math.sin(radians(to.lat)) -
    Math.sin(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.cos(longitude);

  return ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
};

/** A route from positions and altitudes; distances are worked out when not given. */
const routeFromPoints = (
  positions: [number, number][],
  altitudes: number[],
  distances: number[] | null = null,
): RoutePoint[] => {
  let covered = 0;

  return positions.map(([lat, lng], index) => {
    if (0 < index && null === distances)
      covered += haversine({lat, lng}, {lat: positions[index - 1][0], lng: positions[index - 1][1]});

    return {lat, lng, altitude: altitudes[index] ?? 0, distance: distances?.[index] ?? covered};
  });
};

/** The route the other way round: its finish first, distances counted from there. */
const reversePoints = (points: RoutePoint[]): RoutePoint[] => {
  const total = points.at(-1)?.distance ?? 0;

  return [...points].reverse().map(point => ({...point, distance: total - point.distance}));
};

const climbing = (points: RoutePoint[]): number =>
  points.reduce(
    (sum, point, index) => sum + (0 < index ? Math.max(0, point.altitude - points[index - 1].altitude) : 0),
    0,
  );

// Rides of about the route's length set the pace: half to twice as long.
const SIMILAR_RANGE = 2;
const MIN_RIDES = 5;
const YEAR_MS = 365 * 86400000;

/**
 * The rider's pace from their outdoor rides of the last two years, about as long as the
 * route: their moving time as a flat pace plus a cost per metre climbed (a least squares fit,
 * t = a × distance + b × climbing). Null without enough rides.
 */
const usualPace = (activities: Activity[], routeDistance: number, now: Date): Pace | null => {
  const outdoor = activities.filter(
    ({sport_type, trainer, distance, moving_time, start_date}) =>
      isPedalled(sport_type) &&
      !trainer &&
      !sport_type.startsWith('Virtual') &&
      5000 < distance &&
      0 < moving_time &&
      now.getTime() - new Date(start_date).getTime() < 2 * YEAR_MS,
  );
  const similar = outdoor.filter(
    ({distance}) => routeDistance / SIMILAR_RANGE <= distance && distance <= routeDistance * SIMILAR_RANGE,
  );
  const rides = MIN_RIDES <= similar.length ? similar : outdoor;
  if (rides.length < MIN_RIDES) return null;

  const sums = rides.reduce(
    (total, {distance, total_elevation_gain, moving_time}) => ({
      distance2: total.distance2 + distance * distance,
      climb2: total.climb2 + total_elevation_gain * total_elevation_gain,
      both: total.both + distance * total_elevation_gain,
      timeDistance: total.timeDistance + moving_time * distance,
      timeClimb: total.timeClimb + moving_time * total_elevation_gain,
    }),
    {distance2: 0, climb2: 0, both: 0, timeDistance: 0, timeClimb: 0},
  );
  const determinant = sums.distance2 * sums.climb2 - sums.both * sums.both;
  const flatOnly = {secondsPerMetre: sums.timeDistance / sums.distance2, secondsPerMetreClimbed: 0};
  if (0 === determinant) return flatOnly;

  const secondsPerMetre = (sums.timeDistance * sums.climb2 - sums.timeClimb * sums.both) / determinant;
  const secondsPerMetreClimbed = (sums.distance2 * sums.timeClimb - sums.both * sums.timeDistance) / determinant;

  // A fit that makes climbing free or the flat impossible says the rides are too alike to tell.
  return 0 < secondsPerMetre && 0 <= secondsPerMetreClimbed ? {secondsPerMetre, secondsPerMetreClimbed} : flatOnly;
};

/** The seconds from the start to each point of the route, at the rider's pace. */
const timeline = (points: RoutePoint[], {secondsPerMetre, secondsPerMetreClimbed}: Pace): number[] => {
  let elapsed = 0;

  return points.map((point, index) => {
    if (0 < index) {
      const previous = points[index - 1];
      elapsed +=
        (point.distance - previous.distance) * secondsPerMetre +
        Math.max(0, point.altitude - previous.altitude) * secondsPerMetreClimbed;
    }

    return elapsed;
  });
};

// A forecast point about every 4 km, at most 40: Open-Meteo's grid is a few km wide anyway.
const SAMPLE_STEP = 4000;
const MAX_SAMPLES = 40;

/** The indexes of the route points the forecast is asked for, from start to finish. */
const sampleIndexes = (points: RoutePoint[]): number[] => {
  if (points.length < 2) return [];

  const total = points.at(-1)?.distance ?? 0;
  const count = Math.min(MAX_SAMPLES, Math.max(2, Math.ceil(total / SAMPLE_STEP) + 1));
  const indexes: number[] = [];

  for (let sample = 0; sample < count; sample++) {
    const target = (total * sample) / (count - 1);
    const index = points.findIndex(({distance}) => distance >= target);
    indexes.push(-1 === index ? points.length - 1 : index);
  }

  return [...new Set(indexes)];
};

// Further than this from the route (m), the rider is off it rather than on it.
const OFF_ROUTE = 300;

type Progress = {
  // How far along the route the nearest point is (m).
  distance: number;
  // How far the rider is from that point (m): over OFF_ROUTE, off the route.
  away: number;
  offRoute: boolean;
  // Seconds behind the plan at that point (negative: ahead).
  behind: number;
  // The share of the route done (0 to 1), and the climbing still ahead (m).
  done: number;
  climbLeft: number;
};

/**
 * Where a rider out on the route is: the nearest point of it, how far along that is, and how
 * the moment compares with when the plan (start, timeline) has them there.
 */
const progressAt = (
  points: RoutePoint[],
  times: number[],
  start: number,
  place: {lat: number; lng: number},
  at: number,
): Progress | null => {
  if (0 === points.length) return null;
  let nearest = 0;
  let away = Infinity;
  points.forEach((point, index) => {
    const gap = haversine(point, place);
    if (gap < away) [nearest, away] = [index, gap];
  });

  const total = points.at(-1)?.distance ?? 0;

  return {
    distance: points[nearest].distance,
    away,
    offRoute: away > OFF_ROUTE,
    behind: (at - (start + times[nearest] * 1000)) / 1000,
    done: 0 < total ? points[nearest].distance / total : 0,
    climbLeft: climbing(points.slice(nearest)),
  };
};

// The elevation chart draws the route in about this many stretches, each by its lowest and
// highest point, so no climb or dip is lost between two.
const PROFILE_STRETCHES = 300;

type ProfilePoint<Point extends RoutePoint = RoutePoint> = Point & {time: number};

/**
 * The route's altitude for the elevation chart, with the time of day the rider gets to each
 * point: every point of a short route, and the lowest and highest of each stretch of a long one.
 */
const elevationProfile = <Point extends RoutePoint>(
  points: Point[],
  times: number[],
  start: number,
): ProfilePoint<Point>[] => {
  const total = points.at(-1)?.distance ?? 0;
  const stretch = total / PROFILE_STRETCHES;
  const at = (index: number): ProfilePoint<Point> => ({...points[index], time: start + times[index] * 1000});
  if (points.length <= 2 * PROFILE_STRETCHES || 0 === stretch) return points.map((_, index) => at(index));

  const kept: number[] = [];
  let first = 0;
  while (first < points.length) {
    const end = Math.min(PROFILE_STRETCHES, Math.floor(points[first].distance / stretch) + 1) * stretch;
    let last = first;
    while (last + 1 < points.length && points[last + 1].distance < end) last++;
    let lowest = first;
    let highest = first;
    for (let index = first; index <= last; index++) {
      if (points[index].altitude < points[lowest].altitude) lowest = index;
      if (points[index].altitude > points[highest].altitude) highest = index;
    }
    kept.push(...[lowest, highest].sort((left, right) => left - right));
    first = last + 1;
  }

  return [...new Set([0, ...kept, points.length - 1])].map(at);
};

// The slope at a point is read over this far either side (m), so a noisy altitude does not
// make every metre a wall.
const GRADE_REACH = 100;

/** The slope at each point of the route (a share: 0.05 is 5 %), uphill positive. */
const gradeAlong = (points: {distance: number; altitude: number}[]): number[] => {
  let [behind, ahead] = [0, 0];

  return points.map(({distance}) => {
    while (points[behind].distance < distance - GRADE_REACH) behind++;
    while (ahead + 1 < points.length && points[ahead].distance < distance + GRADE_REACH) ahead++;
    const length = points[ahead].distance - points[behind].distance;

    return 0 < length ? (points[ahead].altitude - points[behind].altitude) / length : 0;
  });
};

/** The forecast at a moment, between the two hours around it. */
const forecastAt = (hours: HourForecast[], time: number): HourForecast | null => {
  const after = hours.findIndex(hour => hour.time >= time);
  if (-1 === after) return null;
  // Before the first hour the forecast has, there is none.
  if (0 === after) return hours[0].time === time ? hours[0] : null;

  const [before, next] = [hours[after - 1], hours[after]];
  const share = (time - before.time) / (next.time - before.time);
  const between = (key: keyof HourForecast) => before[key] + (next[key] - before[key]) * share;

  return {
    time,
    temperature: between('temperature'),
    feelsLike: between('feelsLike'),
    rainChance: between('rainChance'),
    rain: between('rain'),
    cloud: between('cloud'),
    wind: between('wind'),
    gust: between('gust'),
    // A direction does not average across north: the nearer hour's is taken.
    windFrom: share < 0.5 ? before.windFrom : next.windFrom,
  };
};

/** The wind along the way: the share of it blowing against the rider (negative when behind). */
const headwindOf = (wind: number, windFrom: number, way: number): number => wind * Math.cos(radians(windFrom - way));

/**
 * The weather where the rider is at each forecast point, when they get there. The heading is
 * taken over the next kilometre or so, so a hairpin does not turn a headwind into a tailwind.
 */
const weatherAlong = (
  points: RoutePoint[],
  times: number[],
  start: number,
  indexes: number[],
  forecasts: HourForecast[][],
): WeatherPoint[] =>
  indexes.flatMap((index, sample) => {
    const point = points[index];
    const time = start + times[index] * 1000;
    const forecast = forecastAt(forecasts[sample] ?? [], time);
    if (null === forecast) return [];

    const ahead =
      points.find(({distance}) => distance >= point.distance + 1000) ?? points[Math.min(index + 1, points.length - 1)];
    const behind = index === points.length - 1 ? points[Math.max(0, index - 1)] : point;
    const way = heading(behind, ahead === behind ? point : ahead);

    return [{...forecast, ...point, time, heading: way, headwind: headwindOf(forecast.wind, forecast.windFrom, way)}];
  });

// Above this, the wind counts as with or against the rider (km/h).
const NOTICEABLE_WIND = 5;

/** The share of the route ridden into a headwind, and with a tailwind. */
const windShares = (weather: WeatherPoint[]): {head: number; tail: number} => {
  const total = weather.length || 1;

  return {
    head: weather.filter(({headwind}) => NOTICEABLE_WIND < headwind).length / total,
    tail: weather.filter(({headwind}) => headwind < -NOTICEABLE_WIND).length / total,
  };
};

// A rider on a road bike, as the wind cost counts them: typical values, the same for everyone.
const RIDER = {mass: 85, rolling: 0.005, dragArea: 0.32, airDensity: 1.2};
const GRAVITY = 9.81;

/** The power to hold a speed into a headwind (m/s; negative for a tailwind), on the flat. */
const powerAt = (speed: number, headwind: number): number => {
  const air = speed + headwind;

  return (
    RIDER.rolling * RIDER.mass * GRAVITY * speed + 0.5 * RIDER.airDensity * RIDER.dragArea * Math.abs(air) * air * speed
  );
};

/** The speed the same effort gives into a headwind (m/s; negative for a tailwind). */
const speedInWind = (speed: number, headwind: number): number => {
  const effort = powerAt(speed, 0);
  let [low, high] = [0.1, speed * 4];
  for (let step = 0; step < 50; step++) {
    const middle = (low + high) / 2;
    if (powerAt(middle, headwind) < effort) low = middle;
    else high = middle;
  }

  return (low + high) / 2;
};

/**
 * The seconds the wind costs over the ride (negative when it saves time), at the same effort:
 * each stretch between forecast points ridden at its speed without wind, then into the wind
 * along it. The pace already holds the rider's usual wind, so this is the wind of that day.
 * `riding` is the share of the clock spent riding, the rest being stops spread along the way:
 * the speed comes from the riding time only.
 */
const windCost = (weather: WeatherPoint[], riding = 1): number =>
  weather.slice(0, -1).reduce((total, point, sample) => {
    const next = weather[sample + 1];
    const [length, seconds] = [next.distance - point.distance, ((next.time - point.time) / 1000) * riding];
    if (length <= 0 || seconds <= 0) return total;

    return total + length / speedInWind(length / seconds, point.headwind / 3.6) - seconds;
  }, 0);

// Stops, unless the rider says otherwise: an eighth of the riding time (30 minutes in 4 hours).
const STOP_SHARE = 0.125;

// Starting this many hours earlier or later is what the best start looks at.
const START_SHIFTS = [-3, -2, -1, 0, 1, 2, 3];
const HOUR_MS = 3600000;

type StartOption = {start: number; windCost: number; rainChance: number};

/**
 * The ride started some hours earlier or later, with the wind it costs and the highest chance
 * of rain on the way: only the starts the forecast covers the whole ride for.
 */
const startOptions = (
  points: RoutePoint[],
  times: number[],
  start: number,
  indexes: number[],
  forecasts: HourForecast[][],
  riding = 1,
): StartOption[] =>
  START_SHIFTS.flatMap(shift => {
    const shifted = start + shift * HOUR_MS;
    const weather = weatherAlong(points, times, shifted, indexes, forecasts);
    if (weather.length < indexes.length) return [];

    return [
      {
        start: shifted,
        windCost: windCost(weather, riding),
        rainChance: Math.max(...weather.map(({rainChance}) => rainChance)),
      },
    ];
  });

// A start is worth moving to for 3 minutes less wind or a 20 points lower chance of rain.
const WORTH_SECONDS = 180;
const WORTH_RAIN = 20;

/** The best start among the options: least rain first when it matters, then least wind. Null when the chosen one is it. */
const betterStart = (options: StartOption[], start: number): StartOption | null => {
  const chosen = options.find(option => option.start === start);
  if (undefined === chosen) return null;

  const score = ({windCost: cost, rainChance}: StartOption) => cost / WORTH_SECONDS + rainChance / WORTH_RAIN;
  const best = options.reduce((winner, option) => (score(option) < score(winner) ? option : winner), chosen);
  const better = chosen.windCost - best.windCost >= WORTH_SECONDS || chosen.rainChance - best.rainChance >= WORTH_RAIN;

  return best !== chosen && better ? best : null;
};

// Start and finish this close make a loop, which can be ridden either way.
const LOOP_GAP = 2000;

const isLoop = (points: RoutePoint[]): boolean =>
  1 < points.length && haversine(points[0], points[points.length - 1]) <= LOOP_GAP;

/**
 * The same loop ridden the other way, with the weather at the same places: the forecast
 * points are the same ones, met in the other order.
 */
const weatherReversed = (
  points: RoutePoint[],
  pace: Pace,
  start: number,
  indexes: number[],
  forecasts: HourForecast[][],
  // The clock time over the riding time, stops included.
  stretch = 1,
): WeatherPoint[] => {
  const reversed = reversePoints(points);
  const last = points.length - 1;

  return weatherAlong(
    reversed,
    timeline(reversed, pace).map(seconds => seconds * stretch),
    start,
    [...indexes].reverse().map(index => last - index),
    [...forecasts].reverse(),
  );
};

// Rain counts from this chance (%) or this much (mm per hour).
const LIKELY_RAIN = 40;
const SOME_RAIN = 0.3;

/** Where rain is likely on the way: from the first point it is to the last, or null when dry. */
const rainSpell = (weather: WeatherPoint[]): {from: WeatherPoint; to: WeatherPoint} | null => {
  const wet = weather.filter(({rainChance, rain}) => LIKELY_RAIN <= rainChance || SOME_RAIN <= rain);

  return 0 === wet.length ? null : {from: wet[0], to: wet[wet.length - 1]};
};

/** What to wear, from the coldest it feels on the way, the chance of rain and the gusts. */
// The ride is wet when rain is likely at this share of its forecast points or more.
const WET_SHARE = 0.3;
// Wind (km/h, average) or gusts (km/h) strong enough to be the ride's weather.
const STRONG_WIND = 30;
const STRONG_GUST = 55;
type Sky = {emoji: string; label: string};

// Cloud cover (%, average) from which each sky shows, cloudiest first.
const SKIES: [number, Sky][] = [
  [80, {emoji: '☁️', label: 'Overcast'}],
  [55, {emoji: '🌥️', label: 'Mostly cloudy'}],
  [30, {emoji: '⛅', label: 'Partly cloudy'}],
  [10, {emoji: '🌤️', label: 'Mostly sunny'}],
  [0, {emoji: '☀️', label: 'Sunny'}],
];

/** The ride's weather as one emoji and a word: rain first, then strong wind, then the clouds. Null with no forecast. */
const rideSky = (weather: WeatherPoint[]): Sky | null => {
  if (0 === weather.length) return null;
  const wet = weather.filter(({rainChance, rain}) => LIKELY_RAIN <= rainChance && SOME_RAIN <= rain).length;
  if (wet >= WET_SHARE * weather.length) return {emoji: '🌧️', label: 'Rain'};
  if (null !== rainSpell(weather)) return {emoji: '🌦️', label: 'Showers likely'};
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  if (
    average(weather.map(({wind}) => wind)) >= STRONG_WIND ||
    Math.max(...weather.map(({gust}) => gust)) >= STRONG_GUST
  )
    return {emoji: '💨', label: 'Windy'};
  const cloud = average(weather.map(({cloud: cover}) => cover));

  return SKIES.find(([from]) => cloud >= from)?.[1] ?? SKIES[SKIES.length - 1][1];
};

const outfit = (weather: WeatherPoint[]): string => {
  const coldest = Math.min(...weather.map(({feelsLike}) => feelsLike));
  const clothes =
    20 <= coldest
      ? 'Short sleeves'
      : 15 <= coldest
        ? 'Short sleeves, arm warmers to hand'
        : 10 <= coldest
          ? 'Long sleeves or arm warmers, knee warmers'
          : 5 <= coldest
            ? 'A jacket, long gloves and leg warmers'
            : 0 <= coldest
              ? 'Winter jacket, thermal tights, warm gloves and overshoes'
              : 'Full winter kit, with something over the face';
  const rain = rainSpell(weather) ? ', a rain jacket' : '';
  const gusts = Math.max(...weather.map(({gust}) => gust)) >= 45 ? '; mind the gusts' : '';

  return `${clothes}${rain}${gusts}.`;
};

export {
  betterStart,
  climbing,
  elevationProfile,
  gradeAlong,
  FORECAST_DAYS,
  forecastAt,
  haversine,
  heading,
  headwindOf,
  isLoop,
  LOOP_GAP,
  NOTICEABLE_WIND,
  progressAt,
  outfit,
  rainSpell,
  reversePoints,
  rideSky,
  routeFromPoints,
  sampleIndexes,
  speedInWind,
  START_SHIFTS,
  STOP_SHARE,
  startOptions,
  timeline,
  usualPace,
  weatherAlong,
  weatherReversed,
  windCost,
  windShares,
};
export type {
  HourForecast,
  Pace,
  PlannedRoute,
  ProfilePoint,
  Progress,
  RoutePoint,
  RouteSource,
  Sky,
  StartOption,
  WeatherPoint,
};
