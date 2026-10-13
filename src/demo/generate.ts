import {BikeExpense, encodePolyline, Event, FTPTest, Labels, Settings} from '../models';
import {Activity, ActivityZone, Athlete, DetailedActivity} from '../models/strava';
import {ActivityZoneType} from '../models/strava/activity-zone-type';
import {Random, seeded} from './random';

/**
 * Two years of made-up riding around Annecy, with the parts, tests and costs that go
 * with it. Nothing here is a real person's data. The same day always gives the same
 * data, and dates follow today, so the demo never looks stale.
 */

const SEED = 20261012;
const DAYS = 730;
const DAY_MS = 86400000;
const HOME: [number, number] = [45.899, 6.129];
const WORK: [number, number] = [45.93, 6.2];

const ROAD_BIKE = 'b9000001';
const GRAVEL_BIKE = 'b9000002';
const CITY_BIKE = 'b9000003';
const TRAINER = 'b9000004';
const SHOES = 'g9000001';

const CHAINS = ['🍒', '🫐', '🍑'];
const POOLS = ['Jean Régis', 'Marquisats'];
const COURTS = ['Annecy-le-Vieux', 'Seynod'];
const CLUB = 'Les Copains';
const CLUB_GROUPS = ['C1', 'C2', 'Chill'];
const FINISHES = ['Café du Port', 'La Brasserie', 'Le Belvédère', 'Chez Jo'];

const ROAD_NAMES = ['Lake loop 🌊', 'Col de la Forclaz ⛰️', 'Semnoz climb 🏔️', 'Bauges 🐐', 'Aravis 🧀', 'Leschaux 🌲', 'Easy spin 🧘', 'Intervals 🔥'];
const LONG_NAMES = ['Grand tour 🗺️', 'Lake Geneva 🇨🇭', 'Three passes 🏔️', 'Chartreuse 🍸'];
const GRAVEL_NAMES = ['Gravel in the woods 🌲', 'Dirt roads 🟫', 'Forest tracks 🍄'];

type Kind = 'commute' | 'road' | 'club' | 'long' | 'race' | 'gravel' | 'zwift' | 'run' | 'swim' | 'tennis';

type Profile = {
  sport: string;
  gear: string | null;
  speedKmh: [number, number];
  climbPerKm: [number, number];
  intensity: [number, number] | null;
  outdoor: boolean;
};

const PROFILES: Record<Kind, Profile> = {
  commute: {sport: 'Ride', gear: CITY_BIKE, speedKmh: [22, 26], climbPerKm: [4, 8], intensity: null, outdoor: true},
  road: {sport: 'Ride', gear: ROAD_BIKE, speedKmh: [27, 31], climbPerKm: [8, 16], intensity: [0.72, 0.82], outdoor: true},
  club: {sport: 'Ride', gear: ROAD_BIKE, speedKmh: [30, 33], climbPerKm: [6, 11], intensity: [0.8, 0.9], outdoor: true},
  long: {sport: 'Ride', gear: ROAD_BIKE, speedKmh: [26, 29], climbPerKm: [10, 18], intensity: [0.68, 0.75], outdoor: true},
  race: {sport: 'Ride', gear: ROAD_BIKE, speedKmh: [31, 34], climbPerKm: [12, 16], intensity: [0.86, 0.92], outdoor: true},
  gravel: {sport: 'GravelRide', gear: GRAVEL_BIKE, speedKmh: [19, 23], climbPerKm: [12, 20], intensity: [0.7, 0.8], outdoor: true},
  zwift: {sport: 'VirtualRide', gear: TRAINER, speedKmh: [30, 34], climbPerKm: [5, 12], intensity: [0.8, 0.92], outdoor: false},
  run: {sport: 'Run', gear: SHOES, speedKmh: [10, 12], climbPerKm: [5, 15], intensity: null, outdoor: true},
  swim: {sport: 'Swim', gear: null, speedKmh: [2.4, 3], climbPerKm: [0, 0], intensity: null, outdoor: false},
  tennis: {sport: 'Tennis', gear: null, speedKmh: [0, 0], climbPerKm: [0, 0], intensity: null, outdoor: false},
};

type DemoData = {
  athlete: Athlete;
  activities: Activity[];
  details: Record<string, DetailedActivity>;
  events: Event[];
  ftpTests: FTPTest[];
  expenses: BikeExpense[];
  labels: Labels;
  settings: Partial<Settings>;
};

const KM_PER_DEGREE = 111.32;

/** A point some kilometres away from another, in a direction (radians, 0 = north). */
const offset = ([lat, lng]: [number, number], km: number, direction: number): [number, number] => [
  lat + (km * Math.cos(direction)) / KM_PER_DEGREE,
  lng + (km * Math.sin(direction)) / (KM_PER_DEGREE * Math.cos((lat * Math.PI) / 180)),
];

// One point every 250 m: enough for the explorer tiles, light enough to generate quickly.
const POINT_KM = 0.25;

/** A wobbly loop that starts and ends at home, roughly the length of the ride. */
const loop = (random: Random, km: number, heading: number): [number, number][] => {
  const radius = km / (2 * Math.PI);
  const center = offset(HOME, radius, heading);
  const phases = [random.between(0, 6), random.between(0, 6)];
  const count = Math.max(8, Math.round(km / POINT_KM));

  return Array.from({length: count + 1}, (_, index) => {
    const angle = heading + Math.PI + (2 * Math.PI * index) / count;
    const wobble = 1 + 0.2 * Math.sin(3 * angle + phases[0]) + 0.12 * Math.sin(5 * angle + phases[1]);

    return offset(center, radius * wobble, angle);
  });
};

/** The way to work or back, with a little sideways wander. */
const commuteLine = (random: Random, toWork: boolean): [number, number][] => {
  const count = 34;
  const wander = random.between(0.002, 0.004);
  const points = Array.from({length: count + 1}, (_, index): [number, number] => {
    const share = index / count;

    return [
      HOME[0] + (WORK[0] - HOME[0]) * share + wander * Math.sin(share * Math.PI * 3),
      HOME[1] + (WORK[1] - HOME[1]) * share,
    ];
  });

  return toWork ? points : points.reverse();
};

const isoDate = (date: Date): string => date.toISOString().replace(/\.\d{3}Z$/, 'Z');

// A steady spread from the id, so the power figures vary without drawing on the seeded
// random numbers (drawing more would change every activity generated after this one).
const spreadOf = (id: number): number => ((id * 37) % 100) / 100;

// Best power over each duration as a share of FTP, at the low and high end of a rider's days.
const CURVE_SHARES: [number, number, number][] = [
  [5, 2.6, 3.4],
  [15, 2.0, 2.6],
  [30, 1.6, 1.95],
  [60, 1.3, 1.55],
  [120, 1.15, 1.3],
  [300, 1.0, 1.1],
  [600, 0.94, 1.0],
  [1200, 0.88, 0.96],
  [1800, 0.84, 0.92],
  [3600, 0.76, 0.86],
];

/** What the server works out from a ride's power data, made up around its power and the FTP of the day. */
const powerDetails = (id: number, ftp: number, weighted: number | undefined, average: number | undefined, movingTime: number) => {
  if (undefined === weighted || undefined === average) return {};

  const spread = spreadOf(id);
  const power_curve = Object.fromEntries(
    CURVE_SHARES.filter(([seconds]) => seconds <= movingTime).map(([seconds, low, high]) => [
      seconds,
      Math.max(average, Math.round(ftp * (low + (high - low) * spread) * Math.min(1, weighted / (ftp * 0.8)))),
    ]),
  );
  // Moving seconds per 25 W band: some coasting, the rest spread around the average power.
  const bands = Math.ceil((average * 2) / 25);
  const weights = Array.from({length: bands}, (_, band) => Math.max(0, 1 - Math.abs(band * 25 + 12.5 - average) / average));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const power_histogram = weights.map((weight, band) => Math.round((0 === band ? 0.15 : 0) * movingTime + (weight / total) * movingTime * 0.85));

  return {
    normalized_power: Math.round(weighted * 1.04),
    power_curve,
    power_histogram,
    heart_rate_drift: movingTime >= 3600 ? Math.round((spread * 9 - 1) * 10) / 10 : null,
  };
};

/** Strava's best efforts on a run, at a little faster than the run's own pace. */
const runEfforts = (kind: Kind, distance: number, movingTime: number) => {
  if ('run' !== kind || 0 === distance) return {};

  const pace = movingTime / distance;
  const efforts: [string, number][] = [
    ['1K', 1000],
    ['5K', 5000],
    ['10K', 10000],
    ['Half-Marathon', 21097],
  ];

  return {
    best_efforts: efforts
      .filter(([, metres]) => metres <= distance)
      .map(([name, metres]) => ({name, distance: metres, elapsed_time: Math.round(metres * pace * (1000 === metres ? 0.93 : 0.97))})),
  };
};

/** Generates the whole demo for a given day. */
const generateDemo = (today: Date = new Date()): DemoData => {
  const random = seeded(SEED);
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const start = end - DAYS * DAY_MS;

  // Fitness grows over the two years.
  const ftpAt = (time: number): number => Math.round(245 + (30 * (time - start)) / (end - start));
  const seasonTemp = (date: Date): number => {
    const dayOfYear = (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / DAY_MS;

    return 12 + 10 * Math.sin(((dayOfYear - 110) / 365) * 2 * Math.PI);
  };

  const activities: Activity[] = [];
  const details: Record<string, DetailedActivity> = {};
  let nextId = 9000000000;
  let clubRide = 600;

  type Extra = {description?: string; privateNote?: string; points?: [number, number][]; athletes?: number};

  const create = (kind: Kind, date: Date, km: number, name: string, hourLocal: number, extra: Extra = {}) => {
    const profile = PROFILES[kind];
    const id = nextId++;
    const startTime = new Date(date.getTime() + (hourLocal - 1) * 3600000 + random.integer(0, 50) * 60000);
    const distance = Math.round(km * 1000);
    const movingTime =
      'tennis' === kind ? random.integer(3600, 5400) : Math.round(distance / (random.between(...profile.speedKmh) / 3.6));
    const intensity = null === profile.intensity ? null : random.between(...profile.intensity);
    const weighted = null === intensity ? undefined : Math.round(ftpAt(date.getTime()) * intensity);
    const averageWatts = undefined === weighted ? undefined : Math.round(weighted * random.between(0.9, 0.95));
    const heartRate = Math.round(
      null !== intensity ? 100 + intensity * 70 + random.between(-5, 5) : {run: 150, swim: 128, tennis: 138}[kind as string] ?? 132,
    );
    const hours = movingTime / 3600;
    const points = extra.points ?? [];
    const summaryPoints = points.filter((_, index) => 0 === index % 6 || index === points.length - 1);
    const temperature = profile.outdoor ? Math.round(seasonTemp(date) + random.between(-3, 3)) : undefined;
    const prs = random.chance(0.25) ? random.integer(1, 4) : 0;

    const summary = {
      id,
      name,
      type: profile.sport,
      sport_type: profile.sport,
      start_date: isoDate(startTime),
      start_date_local: isoDate(new Date(startTime.getTime() + 3600000)),
      timezone: '(GMT+01:00) Europe/Paris',
      utc_offset: 3600,
      distance,
      moving_time: movingTime,
      elapsed_time: Math.round(movingTime * random.between(1.04, 1.2)),
      total_elevation_gain: Math.round(km * random.between(...profile.climbPerKm)),
      average_speed: 0 === movingTime ? 0 : distance / movingTime,
      max_speed: (distance / Math.max(movingTime, 1)) * random.between(1.8, 2.3),
      average_watts: averageWatts,
      weighted_average_watts: weighted,
      max_watts: undefined === weighted ? undefined : Math.round(weighted * random.between(2.8, 3.8)),
      kilojoules: undefined === averageWatts ? undefined : Math.round((averageWatts * movingTime) / 1000),
      device_watts: undefined !== weighted,
      has_heartrate: true,
      average_heartrate: heartRate,
      max_heartrate: heartRate + random.integer(18, 32),
      suffer_score: Math.round(hours * (intensity ?? 0.65) ** 2 * 95),
      average_cadence: 'Swim' === profile.sport || 'Tennis' === profile.sport ? undefined : random.integer(82, 92),
      average_temp: temperature,
      kudos_count: 'club' === kind ? random.integer(10, 30) : 'commute' === kind ? random.integer(0, 3) : random.integer(2, 15),
      pr_count: prs,
      achievement_count: prs + random.integer(0, 3),
      athlete_count: extra.athletes ?? (random.chance(0.1) ? random.integer(2, 3) : 1),
      total_photo_count: 0,
      photo_count: 0,
      comment_count: 0,
      commute: 'commute' === kind,
      private: random.chance(0.04),
      trainer: 'zwift' === kind,
      manual: false,
      gear_id: profile.gear,
      workout_type: 'race' === kind ? 11 : 'zwift' === kind ? 12 : 'Run' === profile.sport ? 0 : 10,
      start_latlng: 0 === points.length ? [] : points[0],
      end_latlng: 0 === points.length ? [] : points[points.length - 1],
      map: {id: `a${id}`, summary_polyline: encodePolyline(summaryPoints), resource_state: 2},
      athlete: {id: 1, resource_state: 1},
    };

    activities.push(summary as unknown as Activity);
    details[id] = {
      ...summary,
      description: extra.description ?? '',
      private_note: extra.privateNote,
      calories: undefined === summary.kilojoules ? Math.round(hours * 550) : Math.round(summary.kilojoules * 1.1),
      device_name: 'zwift' === kind ? 'Zwift' : 'Ride' === profile.sport || 'GravelRide' === profile.sport ? 'Garmin Edge 840' : 'Apple Watch',
      segment_efforts: Array.from({length: Math.floor(km / 6)}, () => ({kom_rank: random.chance(0.004) ? 1 : null})),
      photos: {count: 0, use_primary_photo: false},
      map: {...summary.map, polyline: encodePolyline(points)},
      ...powerDetails(id, ftpAt(date.getTime()), weighted, averageWatts, movingTime),
      ...runEfforts(kind, distance, movingTime),
    } as unknown as DetailedActivity;
  };

  // A day's activities are planned first and created in time order, so ids grow with time as on Strava.
  let planned: Parameters<typeof create>[] = [];
  const add = (...activity: Parameters<typeof create>) => planned.push(activity);

  for (let day = 0; day < DAYS; day++) {
    const date = new Date(start + day * DAY_MS);
    const weekday = date.getUTCDay();
    const month = date.getUTCMonth();
    const summer = 4 <= month && month <= 8;
    const winter = 10 <= month || month <= 1;

    // Weekday commutes.
    if (1 <= weekday && weekday <= 5 && random.chance(winter ? 0.55 : 0.75)) {
      add('commute', date, random.between(8, 9), 'Work 🧱', 8, {points: commuteLine(random, true)});
      add('commute', date, random.between(8, 9), 'Home 🏠', 18, {points: commuteLine(random, false)});
    }

    // Evening rides, indoors in winter.
    if ((2 === weekday || 4 === weekday) && random.chance(winter ? 0.5 : 0.45)) {
      if (winter) add('zwift', date, random.between(25, 40), 'Watopia 🤖', 19);
      else {
        const km = random.between(30, 55);
        add('road', date, km, random.pick(ROAD_NAMES), 19, {points: loop(random, km, random.between(0, 6.28))});
      }
    }

    // The Saturday club ride, with the finish and normalized power noted afterwards.
    if (6 === weekday && random.chance(winter ? 0.6 : 0.85)) {
      const km = random.between(summer ? 80 : 65, summer ? 115 : 90);
      const group = random.pick(CLUB_GROUPS);
      // Club rides get their emoji like the rest; the odd one is a pirate group.
      const emoji = random.chance(0.1) ? '🏴‍☠️' : random.pick(['🥐', '☕️', '🍕', '🍦', '🧀', '🍻']);
      const np = Math.round(ftpAt(date.getTime()) * random.between(0.82, 0.92));
      add('club', date, km, `${CLUB} #${clubRide++} ${group} ${emoji}`, 9, {
        description: `Good pace today.\nFinish au ${random.pick(FINISHES)}`,
        privateNote: `NP: ${np}`,
        points: loop(random, km, random.between(0, 6.28)),
        athletes: random.integer(6, 14),
      });
    }

    // Sunday: a long ride, a gravel ride, or a run.
    if (0 === weekday) {
      const firstSundayOfJune = 5 === month && date.getUTCDate() <= 7;
      if (firstSundayOfJune) {
        add('race', date, 142, 'Gran Fondo Annecy 🏅', 7, {points: loop(random, 142, 2.5), athletes: 1200});
      } else if (random.chance(summer ? 0.45 : 0.25)) {
        const km = random.chance(0.06) ? random.between(200, 230) : random.between(90, 150);
        add('long', date, km, random.pick(LONG_NAMES), 8, {points: loop(random, km, random.between(0, 6.28))});
      } else if (random.chance(0.4)) {
        const km = random.between(40, 80);
        add('gravel', date, km, random.pick(GRAVEL_NAMES), 9, {points: loop(random, km, random.between(3.5, 5.5))});
      } else if (random.chance(0.5)) {
        const km = random.between(7, 14);
        add('run', date, km, 'Morning run 🌅', 9, {points: loop(random, km, random.between(0, 6.28))});
      }
    }

    if (3 === weekday && random.chance(0.3)) add('swim', date, random.between(1.5, 2.5), `Natation ${random.pick(POOLS)} 🏊`, 12);
    if (5 === weekday && random.chance(0.2)) add('tennis', date, 0, `Tennis ${random.pick(COURTS)} 🎾`, 20);

    planned.sort((a, b) => a[4] - b[4]).forEach(activity => create(...activity));
    planned = [];
  }

  activities.sort((a, b) => b.id - a.id);

  // The newest ride keeps Strava's default name, as a ride not yet given its emoji would.
  const newestRide = activities.find(({sport_type, commute}) => 'Ride' === sport_type && !commute);
  if (undefined !== newestRide) {
    newestRide.name = 'Afternoon Ride';
    details[newestRide.id].name = 'Afternoon Ride';
  }

  const {events, expenses} = generateParts(random, activities);
  const ftpTests = Array.from({length: Math.floor(DAYS / 120) + 1}, (_, index) => {
    const date = new Date(start + index * 120 * DAY_MS + 3 * DAY_MS);

    return {id: `demo-ftp-${index}`, date, ftp: Math.round(ftpAt(date.getTime()) / 5) * 5, weight: Math.round((74 - index * 0.3) * 10) / 10};
  }).reverse();

  const kmOn = (gear: string) => activities.filter(({gear_id}) => gear === gear_id).reduce((total, {distance}) => total + distance, 0);
  const gear = (id: string, name: string, primary = false) => ({id, name, nickname: name, primary, retired: false, distance: kmOn(id), converted_distance: kmOn(id) / 1000, resource_state: 2});
  const latestFtp = ftpTests[0];

  const athlete = {
    id: 1,
    firstname: 'Demo',
    lastname: 'Rider',
    city: 'Annecy',
    country: 'France',
    ftp: latestFtp.ftp,
    weight: latestFtp.weight,
    measurement_preference: 'meters',
    bikes: [gear(ROAD_BIKE, 'Aero 🦈', true), gear(GRAVEL_BIKE, 'Gravel 🦊'), gear(CITY_BIKE, 'City bike 🧱'), gear(TRAINER, 'Home trainer 🤖')],
    shoes: [gear(SHOES, 'Running shoes 👟')],
  } as unknown as Athlete;

  const weekKey = (time: number) => {
    const date = new Date(time);
    const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((time - yearStart) / DAY_MS + new Date(yearStart).getUTCDay() + 1) / 7);

    return `${date.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
  };

  return {
    athlete,
    activities,
    details,
    events,
    ftpTests,
    expenses,
    labels: {
      [weekKey(end - 21 * DAY_MS)]: 'Alps trip ⛰️',
      [weekKey(end - 70 * DAY_MS)]: 'Holidays 🏖️',
      'Jean Régis': '🌊',
      Marquisats: '⛲',
    },
    settings: {
      defaultBike: ROAD_BIKE,
      costBike: ROAD_BIKE,
      retiredBikes: [],
      retiredChains: [],
      yearGoalKm: 8000,
      sports: ['Ride', 'Run', 'Swim', 'Tennis'],
      heartRate: {zones: [120, 145, 160, 175]},
      weightKg: latestFtp.weight,
      mapCenter: HOME,
      locale: 'en-GB',
      normalizedPowerFromNote: true,
      unprocessedEmoji: true,
      club: {name: CLUB, markers: {Pirate: ['🏴‍☠️']}, groupWords: [CLUB], groupTags: ['group']},
    },
  };
};

/**
 * Parts follow the distance actually ridden: chains rotate every 400 km or so, tires,
 * pads and batteries wear out, cassettes are swapped for the mountains each summer, and
 * the odd puncture and one fall happen along the way.
 */
const generateParts = (random: Random, activities: Activity[]): {events: Event[]; expenses: BikeExpense[]} => {
  const events: Event[] = [];
  const expenses: BikeExpense[] = [];
  let count = 0;
  const add = (event: Omit<Event, 'id'>) => events.push({id: `demo-event-${count++}`, ...event} as Event);
  const spend = (date: Date, amount: number, description: string) =>
    expenses.push({id: `demo-expense-${expenses.length}`, date, amount, description});
  const after = (activity: Activity) => new Date(new Date(activity.start_date).getTime() + 12 * 3600000);

  const chronological = [...activities].sort((a, b) => a.id - b.id);
  const first = chronological[0];
  const firstDate = new Date(new Date(first.start_date).getTime() - DAY_MS);

  // What each bike starts with.
  add({type: 'chain', date: firstDate, bike: ROAD_BIKE, chain: CHAINS[0]} as Omit<Event, 'id'>);
  add({type: 'tire', date: firstDate, bike: ROAD_BIKE, brand: 'Continental', model: 'GP5000', width: 28} as Omit<Event, 'id'>);
  add({type: 'cassette', date: firstDate, bike: ROAD_BIKE, brand: 'Shimano', model: 'Ultegra', range: '11-30'} as Omit<Event, 'id'>);
  add({type: 'saddle', date: firstDate, bike: ROAD_BIKE, brand: 'Fizik', model: 'Antares', width: 140} as Omit<Event, 'id'>);
  for (const type of ['brake_pad', 'brake_bleed', 'battery'] as const) add({type, date: firstDate, bike: ROAD_BIKE} as Omit<Event, 'id'>);
  add({type: 'chain', date: firstDate, bike: GRAVEL_BIKE, chain: '🟤'} as Omit<Event, 'id'>);
  add({type: 'tire', date: firstDate, bike: GRAVEL_BIKE, brand: 'Specialized', model: 'Pathfinder', width: 42} as Omit<Event, 'id'>);
  add({type: 'chain', date: firstDate, bike: CITY_BIKE, chain: '⚫️'} as Omit<Event, 'id'>);
  add({type: 'tire', date: firstDate, bike: CITY_BIKE, brand: 'Schwalbe', model: 'Marathon Plus', width: 35} as Omit<Event, 'id'>);
  add({type: 'brake_pad', date: firstDate, bike: CITY_BIKE} as Omit<Event, 'id'>);

  spend(firstDate, 2400, 'Road bike');
  spend(firstDate, 105, 'Spare chains');
  spend(firstDate, 170, 'Two cassettes');

  const chainTotals: Record<string, number> = {[CHAINS[0]]: 0, [CHAINS[1]]: 0, [CHAINS[2]]: 0};
  let currentChain = CHAINS[0];
  const odometers = {chain: 0, tire: 0, brakePad: 0, battery: 0, gravelTire: 0, cityTire: 0, cityChain: 0};
  const limits = {chain: random.between(360, 420), tire: random.between(5500, 6500), brakePad: random.between(3000, 4000), battery: random.between(800, 1000)};
  let cassette = '11-30';
  let bledThisYear = new Date(firstDate).getUTCFullYear();
  let gravelRides = 0;

  for (const activity of chronological) {
    const km = activity.distance / 1000;
    const date = new Date(activity.start_date);
    const month = date.getUTCMonth();

    if (random.chance(km / 2500)) add({type: 'puncture', date, bike: activity.gear_id ?? ROAD_BIKE} as Omit<Event, 'id'>);

    if (ROAD_BIKE === activity.gear_id) {
      chainTotals[currentChain] += km;
      odometers.chain += km;
      odometers.tire += km;
      odometers.brakePad += km;
      odometers.battery += km;

      if (odometers.chain >= limits.chain) {
        // The least used of the other chains goes on next.
        currentChain = CHAINS.filter(chain => chain !== currentChain).sort((a, b) => chainTotals[a] - chainTotals[b])[0];
        add({type: 'chain', date: after(activity), bike: ROAD_BIKE, chain: currentChain} as Omit<Event, 'id'>);
        odometers.chain = 0;
        limits.chain = random.between(360, 420);
      }
      if (odometers.tire >= limits.tire) {
        const model = random.pick(['GP5000', 'GP5000 S TR']);
        add({type: 'tire', date: after(activity), bike: ROAD_BIKE, brand: 'Continental', model, width: 28} as Omit<Event, 'id'>);
        spend(after(activity), 110, 'Tires');
        odometers.tire = 0;
        limits.tire = random.between(5500, 6500);
      }
      if (odometers.brakePad >= limits.brakePad) {
        add({type: 'brake_pad', date: after(activity), bike: ROAD_BIKE} as Omit<Event, 'id'>);
        spend(after(activity), 25, 'Brake pads');
        odometers.brakePad = 0;
      }
      if (odometers.battery >= limits.battery) {
        add({type: 'battery', date: after(activity), bike: ROAD_BIKE} as Omit<Event, 'id'>);
        odometers.battery = 0;
      }

      // The big cassette goes on for the summer in the mountains.
      const wanted = 5 <= month && month <= 7 ? '11-34' : '11-30';
      if (wanted !== cassette) {
        cassette = wanted;
        add({type: 'cassette', date: after(activity), bike: ROAD_BIKE, brand: 'Shimano', model: 'Ultegra', range: wanted} as Omit<Event, 'id'>);
      }
      if (date.getUTCFullYear() > bledThisYear) {
        bledThisYear = date.getUTCFullYear();
        add({type: 'brake_bleed', date: after(activity), bike: ROAD_BIKE} as Omit<Event, 'id'>);
        spend(after(activity), 120, 'Yearly service');
      }
    }

    if (GRAVEL_BIKE === activity.gear_id) {
      odometers.gravelTire += km;
      if (odometers.gravelTire >= 3000) {
        add({type: 'tire', date: after(activity), bike: GRAVEL_BIKE, brand: 'Specialized', model: 'Pathfinder', width: 42} as Omit<Event, 'id'>);
        odometers.gravelTire = 0;
      }
      if (10 === ++gravelRides) {
        add({type: 'fall', date, bike: GRAVEL_BIKE, description: 'Slid on wet leaves'} as Omit<Event, 'id'>);
      }
    }

    if (CITY_BIKE === activity.gear_id) {
      odometers.cityTire += km;
      odometers.cityChain += km;
      if (odometers.cityTire >= 4000) {
        add({type: 'tire', date: after(activity), bike: CITY_BIKE, brand: 'Schwalbe', model: 'Marathon Plus', width: 35} as Omit<Event, 'id'>);
        odometers.cityTire = 0;
      }
      if (odometers.cityChain >= 3000) {
        add({type: 'chain', date: after(activity), bike: CITY_BIKE, chain: '⚫️'} as Omit<Event, 'id'>);
        odometers.cityChain = 0;
      }
    }
  }

  spend(new Date(new Date(chronological[Math.floor(chronological.length / 2)].start_date).getTime()), -300, 'Sold the old wheels');

  return {events, expenses};
};

/** Heart rate zones for an activity, spread around its average heart rate. */
const demoZones = (activity: Activity): ActivityZone[] => {
  const random = seeded(activity.id);
  const ranges = [[0, 120], [120, 145], [145, 160], [160, 175], [175, -1]];
  const center = ranges.findIndex(([, max]) => -1 === max || (activity.average_heartrate ?? 0) < max);
  const weights = ranges.map((_, index) => Math.exp(-((index - center) ** 2)) * random.between(0.7, 1.3));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  return [
    {
      type: ActivityZoneType.Heartrate,
      score: 0,
      points: 0,
      sensor_based: true,
      custom_zones: false,
      max: 0,
      distribution_buckets: ranges.map(([min, max], index) => ({min, max, time: Math.round((activity.moving_time * weights[index]) / total)})),
    },
  ];
};

export {demoZones, generateDemo};
export type {DemoData};
