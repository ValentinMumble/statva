import {extractNormalizedPower} from './activity-meta';
import {daysExceedingDistance, eddingtonNumber} from './activity-stats';
import {countBy} from './util';
import {GetLabel} from './label';
import {BikeExpense} from './bike-expense';
import {Event} from './event';
import {FTPTest} from './ftp';
import {DetailedActivity} from './strava';

type Named = {name: string; value: number};
type Record_ = {id: number; name: string; date: string; value: number; label: string};

type Dashboard = {
  totals: {
    rides: number;
    distance: number;
    movingTime: number;
    elevation: number;
    kudos: number;
    prs: number;
    photos: number;
    calories: number;
    koms: number;
    kilojoules: number;
    medianStopMinutes: number;
    withPowerMeter: number;
    commutes: number;
    indoor: number;
    solo: number;
    maxHeartRate: number;
    activeDays: number;
    biggestWeek: number;
    biggestMonth: number;
    eddington: number;
    firstDate: string | null;
    lastDate: string | null;
  };
  years: {year: number; distance: number; elevation: number; hours: number; rides: number}[];
  months: {year: number; month: number; distance: number}[];
  yearProgress: {years: number[]; rows: Record<string, number | null>[]};
  eddington: {distance: number; days: number}[];
  eddingtonByYear: {year: number; eddington: number}[];
  bigRides: {label: string; count: number}[];
  yearOverYear: {
    year: number;
    previousYear: number;
    rows: {metric: string; current: number; previous: number; format: 'count' | 'km' | 'm' | 'h'}[];
  };
  photos: {id: number; name: string; date: string; url: string}[];
  commute: {count: number; distance: number; co2Kg: number};
  distanceBands: Named[];
  weekendShare: {weekday: number; weekend: number};
  // The next Eddington level needs (E+1) days of at least (E+1) km; this is how many are still missing.
  eddingtonNext: {target: number; have: number; needed: number};
  gear: {name: string; distance: number; rides: number}[];
  startHours: Named[];
  weekdays: Named[];
  sports: {type: string; rides: number; distance: number}[];
  records: {key: string; heading: string; note: string; rides: Record_[]}[];
  ftp: {date: string; label: string; power: number; wattsPerKilo: number; weight: number}[];
  maintenance: {total: number; byType: Named[]};
  spending: {count: number; total: number; centsPerKm: number | null};
  conditions: {temperatures: Named[]; devices: Named[]; heartRates: Named[]};
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKS_IN_YEAR = 53;
// Ski takes every altitude and speed record, which buries the riding.
const SKI_TYPES = ['AlpineSki', 'BackcountrySki', 'NordicSki', 'RollerSki', 'Snowboard'];
// Milestone distances the counters look for, in km, plus one climbing threshold in metres.
const BIG_RIDE_KM = [100, 150, 200, 300];
const BIG_CLIMB_M = 1000;
// A typical car, so the commute total can be read as emissions avoided.
const CAR_CO2_G_PER_KM = 120;
const DISTANCE_BAND_KM = 20;
const DISTANCE_BAND_CAP_KM = 200;
const PHOTO_COUNT = 12;
// Four years is enough to read the trend without the chart turning into spaghetti.
const COMPARED_YEARS = 4;

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

const dayOfYear = (date: Date): number =>
  Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86_400_000);

const weekOfYear = (date: Date): number => Math.min(WEEKS_IN_YEAR - 1, Math.floor(dayOfYear(date) / 7));

// How far into the year each season had got, so this year can be read against the last few.
const buildYearProgress = (activities: DetailedActivity[]): Dashboard['yearProgress'] => {
  const years = [...new Set(activities.map(activity => utcDate(activity).getUTCFullYear()))]
    .sort((a, b) => a - b)
    .slice(-COMPARED_YEARS);

  if (0 === years.length) return {years: [], rows: []};

  const weekly: Record<number, number[]> = Object.fromEntries(
    years.map(year => [year, new Array<number>(WEEKS_IN_YEAR).fill(0)]),
  );
  const lastWeek: Record<number, number> = Object.fromEntries(years.map(year => [year, 0]));

  activities.forEach(activity => {
    const date = utcDate(activity);
    const year = date.getUTCFullYear();

    if (!(year in weekly)) return;

    const week = weekOfYear(date);
    weekly[year][week] += activity.distance / 1000;
    lastWeek[year] = Math.max(lastWeek[year], week);
  });

  const currentYear = years[years.length - 1];
  const running: Record<number, number> = Object.fromEntries(years.map(year => [year, 0]));

  const rows = [...Array(WEEKS_IN_YEAR).keys()].map(week => {
    const row: Record<string, number | null> = {week: week + 1};

    years.forEach(year => {
      running[year] += weekly[year][week];
      // The year in progress stops where it got to, instead of flatlining to December.
      row[String(year)] = year === currentYear && week > lastWeek[year] ? null : Math.round(running[year]);
    });

    return row;
  });

  return {years, rows};
};

// This year against last year up to the same day, so a September comparison is fair.
const buildYearOverYear = (activities: DetailedActivity[]): Dashboard['yearOverYear'] => {
  const last = activities.at(-1);

  if (undefined === last) return {year: 0, previousYear: 0, rows: []};

  const year = utcDate(last).getUTCFullYear();
  const cutoff = dayOfYear(utcDate(last));
  const upTo = (target: number) =>
    activities.filter(activity => {
      const date = utcDate(activity);

      return date.getUTCFullYear() === target && dayOfYear(date) <= cutoff;
    });
  const current = upTo(year);
  const previous = upTo(year - 1);
  const measure = (
    metric: string,
    format: Dashboard['yearOverYear']['rows'][number]['format'],
    pick: (activity: DetailedActivity) => number,
  ) => ({metric, format, current: sum(current.map(pick)), previous: sum(previous.map(pick))});

  return {
    year,
    previousYear: year - 1,
    rows: [
      measure('Activities', 'count', () => 1),
      measure('Distance', 'km', ({distance}) => distance),
      measure('Climbing', 'm', ({total_elevation_gain}) => total_elevation_gain ?? 0),
      measure('Time moving', 'h', ({moving_time}) => moving_time),
      measure('Kudos', 'count', ({kudos_count}) => kudos_count ?? 0),
    ],
  };
};

const median = (values: number[]): number => {
  if (0 === values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.floor(sorted.length / 2)];
};

const bucketed = (values: number[], size: number, unit: string): Named[] =>
  Object.entries(
    values.reduce((map: Record<string, number>, value) => {
      const bucket = Math.floor(value / size) * size;
      map[bucket] = (map[bucket] ?? 0) + 1;

      return map;
    }, {}),
  )
    .map(([bucket, value]) => ({name: `${bucket}${unit}`, value, bucket: Number(bucket)}))
    .sort((a, b) => a.bucket - b.bucket)
    .map(({name, value}) => ({name, value}));

// start_date_local carries local wall time with a Z suffix, so read it in UTC.
const localDate = (activity: DetailedActivity): Date => new Date(activity.start_date_local);
const utcDate = (activity: DetailedActivity): Date => new Date(activity.start_date);

const distanceBy = (
  activities: DetailedActivity[],
  getKey: (date: Date) => string,
): Record<string, number> =>
  activities.reduce((map: Record<string, number>, activity) => {
    const key = getKey(utcDate(activity));
    map[key] = (map[key] ?? 0) + activity.distance / 1000;

    return map;
  }, {});

const toSorted = (counts: Record<string, number>, limit?: number): Named[] => {
  const entries = Object.entries(counts)
    .map(([name, value]) => ({name, value}))
    .sort((a, b) => b.value - a.value);

  return undefined === limit ? entries : entries.slice(0, limit);
};

const topRides = (
  activities: DetailedActivity[],
  getValue: (activity: DetailedActivity) => number | undefined | null,
  format: (value: number) => string,
  {count = 3, lowest = false, locale = 'en-GB'} = {},
): Record_[] =>
  activities
    .map(activity => ({activity, value: getValue(activity)}))
    .filter((entry): entry is {activity: DetailedActivity; value: number} => 'number' === typeof entry.value)
    .sort((a, b) => (lowest ? a.value - b.value : b.value - a.value))
    .slice(0, count)
    .map(({activity, value}) => ({
      id: activity.id,
      name: activity.name,
      date: utcDate(activity).toLocaleDateString(locale),
      value,
      label: format(value),
    }));

const round = (value: number, digits = 0, locale = 'en-GB'): string =>
  value.toLocaleString(locale, {minimumFractionDigits: digits, maximumFractionDigits: digits});

// Local start time as minutes past midnight; start_date_local is wall time with a Z suffix.
const startMinutes = (activity: DetailedActivity): number => {
  const date = localDate(activity);

  return date.getUTCHours() * 60 + date.getUTCMinutes();
};

const clock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// Everything comes from the activities Statva stores, so the page never calls Strava
// and is not affected by its rate limit.
const computeDashboard = (
  activities: DetailedActivity[],
  events: Event[],
  ftpTests: FTPTest[],
  expenses: BikeExpense[],
  label: GetLabel,
  // Dates and numbers are written the rider's way.
  locale = 'en-GB',
): Dashboard => {
  const ranked = (...[activities, getValue, format, options = {}]: Parameters<typeof topRides>) =>
    topRides(activities, getValue, format, {...options, locale});
  const figure = (value: number, digits = 0) => round(value, digits, locale);
  const sorted = [...activities].sort((a, b) => utcDate(a).getTime() - utcDate(b).getTime());

  const years = Object.values(
    sorted.reduce((map: Record<number, Dashboard['years'][number]>, activity) => {
      const year = utcDate(activity).getUTCFullYear();
      const entry = (map[year] ??= {year, distance: 0, elevation: 0, hours: 0, rides: 0});
      entry.distance += activity.distance;
      entry.elevation += activity.total_elevation_gain ?? 0;
      entry.hours += activity.moving_time / 3600;
      entry.rides++;

      return map;
    }, {}),
  );

  const months = Object.values(
    sorted.reduce((map: Record<string, Dashboard['months'][number]>, activity) => {
      const date = utcDate(activity);
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      const entry = (map[key] ??= {year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, distance: 0});
      entry.distance += activity.distance;

      return map;
    }, {}),
  );

  const gear = Object.entries(
    sorted.reduce((map: Record<string, {distance: number; rides: number}>, activity) => {
      const key = activity.gear_id ?? 'none';
      const entry = (map[key] ??= {distance: 0, rides: 0});
      entry.distance += activity.distance;
      entry.rides++;

      return map;
    }, {}),
  )
    .map(([gearId, entry]) => ({name: 'none' === gearId ? '🤷' : label(gearId), ...entry}))
    .sort((a, b) => b.distance - a.distance);

  const onFoot = sorted.filter(({sport_type}) => !SKI_TYPES.includes(sport_type));
  const rides = sorted.filter(({sport_type}) => sport_type.includes('Ride'));
  // Speed, gradient and weather only mean something on a real road.
  const outdoor = onFoot.filter(({trainer, sport_type}) => !trainer && 'VirtualRide' !== sport_type);
  const [eddington] = eddingtonNumber(rides);
  const commutes = sorted.filter(({commute}) => commute);
  const daysByDistance = daysExceedingDistance(rides);
  const activeDays = [...new Set(sorted.map(activity => activity.start_date_local.slice(0, 10)))].sort();
  const expenseTotal = sum(expenses.map(({amount}) => amount));
  const mainBike = gear.at(0);

  return {
    totals: {
      rides: sorted.length,
      distance: sum(sorted.map(({distance}) => distance)),
      movingTime: sum(sorted.map(({moving_time}) => moving_time)),
      elevation: sum(sorted.map(({total_elevation_gain}) => total_elevation_gain ?? 0)),
      kudos: sum(sorted.map(({kudos_count}) => kudos_count ?? 0)),
      prs: sum(sorted.map(({pr_count}) => pr_count ?? 0)),
      photos: sum(sorted.map(({total_photo_count}) => total_photo_count ?? 0)),
      calories: sum(sorted.map(({calories}) => calories ?? 0)),
      koms: sorted.filter(({segment_efforts}) => segment_efforts?.some(({kom_rank}) => 1 === kom_rank)).length,
      kilojoules: sum(sorted.map(({kilojoules}) => kilojoules ?? 0)),
      // Paused round trips leave hours of fake standing time, so the middle ride is the honest figure.
      medianStopMinutes: Math.round(
        median(
          sorted
            .map(({elapsed_time, moving_time}) => (elapsed_time ?? 0) - (moving_time ?? 0))
            .filter(gap => 0 < gap),
        ) / 60,
      ),
      withPowerMeter: sorted.filter(({device_watts}) => device_watts).length,
      commutes: sorted.filter(({commute}) => commute).length,
      indoor: sorted.filter(({trainer}) => trainer).length,
      solo: sorted.filter(({athlete_count}) => 2 > (athlete_count ?? 1)).length,
      maxHeartRate: Math.max(0, ...sorted.map(({max_heartrate}) => max_heartrate ?? 0)),
      activeDays: activeDays.length,
      biggestWeek: Math.max(0, ...Object.values(distanceBy(sorted, date => `${date.getUTCFullYear()}-${weekOfYear(date)}`))),
      biggestMonth: Math.max(0, ...Object.values(distanceBy(sorted, date => `${date.getUTCFullYear()}-${date.getUTCMonth()}`))),
      eddington,
      firstDate: sorted.at(0) ? utcDate(sorted[0]).toLocaleDateString(locale) : null,
      lastDate: sorted.at(-1) ? utcDate(sorted[sorted.length - 1]).toLocaleDateString(locale) : null,
    },
    years,
    months,
    yearProgress: buildYearProgress(sorted),
    // How many days beat each distance, with the Eddington number where the two meet.
    eddington: Object.entries(daysByDistance)
      .map(([distance, days]) => ({distance: Number(distance), days}))
      .filter(({distance}) => 0 < distance)
      .sort((a, b) => a.distance - b.distance),
    eddingtonNext: {
      target: eddington + 1,
      have: daysByDistance[eddington + 1] ?? 0,
      needed: eddington + 1 - (daysByDistance[eddington + 1] ?? 0),
    },
    eddingtonByYear: [...new Set(rides.map(ride => utcDate(ride).getUTCFullYear()))]
      .sort((a, b) => a - b)
      .map(year => ({
        year,
        eddington: eddingtonNumber(rides.filter(ride => utcDate(ride).getUTCFullYear() === year))[0],
      })),
    bigRides: [
      ...BIG_RIDE_KM.map(km => ({
        label: `${km} km+`,
        count: rides.filter(({distance}) => km * 1000 <= distance).length,
      })),
      {
        label: `${BIG_CLIMB_M} m+ climbing`,
        count: rides.filter(({total_elevation_gain}) => BIG_CLIMB_M <= (total_elevation_gain ?? 0)).length,
      },
    ],
    yearOverYear: buildYearOverYear(sorted),
    photos: [...sorted]
      .reverse()
      .map(activity => ({activity, url: activity.photos?.primary?.urls?.[600] ?? activity.photos?.primary?.urls?.[100]}))
      .filter((entry): entry is {activity: DetailedActivity; url: string} => 'string' === typeof entry.url)
      .slice(0, PHOTO_COUNT)
      .map(({activity, url}) => ({
        id: activity.id,
        name: activity.name,
        date: utcDate(activity).toLocaleDateString(locale),
        url,
      })),
    commute: {
      count: commutes.length,
      distance: sum(commutes.map(({distance}) => distance)),
      co2Kg: (sum(commutes.map(({distance}) => distance)) / 1000) * (CAR_CO2_G_PER_KM / 1000),
    },
    distanceBands: [...Array(DISTANCE_BAND_CAP_KM / DISTANCE_BAND_KM + 1).keys()]
      .map(index => index * DISTANCE_BAND_KM)
      .map(from => ({
        name: from >= DISTANCE_BAND_CAP_KM ? `${from}+` : `${from}–${from + DISTANCE_BAND_KM}`,
        value: rides.filter(({distance}) => {
          const km = distance / 1000;

          return from >= DISTANCE_BAND_CAP_KM ? km >= from : km >= from && km < from + DISTANCE_BAND_KM;
        }).length,
      })),
    weekendShare: {
      weekday: sum(rides.filter(ride => localDate(ride).getUTCDay() % 6 !== 0).map(({distance}) => distance)),
      weekend: sum(rides.filter(ride => localDate(ride).getUTCDay() % 6 === 0).map(({distance}) => distance)),
    },
    gear,
    startHours: Object.entries(countBy(sorted, activity => String(localDate(activity).getUTCHours())))
      .map(([hour, value]) => ({name: `${hour}h`, value, hour: Number(hour)}))
      .sort((a, b) => a.hour - b.hour)
      .map(({name, value}) => ({name, value})),
    weekdays: WEEKDAYS.map(day => ({
      name: day.slice(0, 3),
      value: sorted.filter(activity => WEEKDAYS[(localDate(activity).getUTCDay() + 6) % 7] === day).length,
    })),
    sports: toSorted(countBy(sorted, ({sport_type}) => sport_type)).map(({name, value}) => ({
      type: label(name),
      rides: value,
      distance: sum(sorted.filter(({sport_type}) => sport_type === name).map(({distance}) => distance)),
    })),
    records: [
      {
        key: 'distance',
        heading: 'Longest',
        note: 'distance',
        rides: ranked(onFoot, a => a.distance / 1000, v => `${figure(v)} km`),
      },
      {
        key: 'elevation',
        heading: 'Most climbing',
        note: 'metres gained',
        rides: ranked(onFoot, a => a.total_elevation_gain, v => `${figure(v)} m`),
      },
      {
        key: 'hilliest',
        heading: 'Hilliest',
        note: 'climbing per km, rides over 30 km',
        rides: ranked(
          outdoor.filter(({distance}) => 30_000 <= distance),
          a => (a.total_elevation_gain ?? 0) / (a.distance / 1000),
          v => `${figure(v, 1)} m/km`,
        ),
      },
      {
        key: 'speed',
        heading: 'Fastest',
        note: 'average speed, rides over 50 km',
        rides: ranked(
          outdoor.filter(({distance}) => 50_000 <= distance),
          a => a.average_speed * 3.6,
          v => `${figure(v, 1)} km/h`,
        ),
      },
      {
        key: 'power',
        heading: 'Strongest',
        note: 'normalized power from the ride notes, rides over an hour',
        // Strava estimates a power figure for runs too, which would put trail runs on top.
        // The NP logged in the private note only exists for rides with a real power meter.
        rides: ranked(
          rides.filter(({moving_time}) => 3600 <= moving_time),
          extractNormalizedPower,
          v => `${figure(v)} W`,
        ),
      },
      {
        key: 'suffer',
        heading: 'Hardest',
        note: 'suffer score',
        rides: ranked(onFoot, a => a.suffer_score || null, v => figure(v)),
      },
      {
        key: 'prs',
        heading: 'Most records',
        note: 'personal records in one ride',
        rides: ranked(onFoot, a => a.pr_count || null, v => `${figure(v)} PRs`),
      },
      {
        key: 'coldest',
        heading: 'Coldest',
        note: 'average temperature',
        rides: ranked(outdoor, a => a.average_temp, v => `${figure(v)} °C`, {lowest: true}),
      },
      {
        key: 'hottest',
        heading: 'Hottest',
        note: 'average temperature',
        rides: ranked(outdoor, a => a.average_temp, v => `${figure(v)} °C`),
      },
      {
        key: 'earliest',
        heading: 'Earliest start',
        note: 'local time',
        rides: ranked(outdoor, startMinutes, clock, {lowest: true}),
      },
      {
        key: 'kudos',
        heading: 'Most kudos',
        note: 'from other riders',
        rides: ranked(onFoot, a => a.kudos_count || null, v => figure(v)),
      },
      {
        key: 'company',
        heading: 'Biggest group',
        note: 'riders on the activity',
        rides: ranked(onFoot, a => (1 < (a.athlete_count ?? 1) ? a.athlete_count : null), v => `${figure(v)} riders`),
      },
    ],
    ftp: [...ftpTests]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(test => ({
        date: new Date(test.date).toLocaleDateString(locale),
        label: new Date(test.date).toLocaleDateString(locale, {month: 'short', year: '2-digit'}),
        power: test.ftp,
        wattsPerKilo: Math.round((test.ftp / test.weight) * 100) / 100,
        weight: test.weight,
      })),
    maintenance: {
      total: events.length,
      byType: toSorted(countBy(events, ({type}) => label(type))),
    },
    spending: {
      count: expenses.length,
      total: expenseTotal,
      centsPerKm:
        undefined === mainBike || 0 === mainBike.distance
          ? null
          : (expenseTotal * 100) / (mainBike.distance / 1000),
    },
    conditions: {
      temperatures: Object.entries(
        countBy(
          sorted.filter(({average_temp}) => undefined !== average_temp && null !== average_temp),
          ({average_temp}) => String(Math.floor((average_temp ?? 0) / 5) * 5),
        ),
      )
        .map(([bucket, value]) => ({name: `${bucket}°`, value, bucket: Number(bucket)}))
        .sort((a, b) => a.bucket - b.bucket)
        .map(({name, value}) => ({name, value})),
      devices: toSorted(countBy(sorted, ({device_name}) => device_name ?? 'unknown'), 8),
      heartRates: bucketed(
        sorted.map(({average_heartrate}) => average_heartrate ?? 0).filter(rate => 0 < rate),
        10,
        ' bpm',
      ),
    },
  };
};

export {computeDashboard};
export type {Dashboard};
