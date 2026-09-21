import {computeFinishCount, extractNPGroup} from './activity-npeloton';
import {countBy} from './util';
import {GetLabel} from './label';
import {BikeExpense} from './bike-expense';
import {Event} from './event';
import {FTPTest} from './ftp';
import {DetailedActivity} from './strava';

type Named = {name: string; value: number};
type Record_ = {name: string; date: string; value: number};

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
    firstDate: string | null;
    lastDate: string | null;
  };
  years: {year: number; distance: number; elevation: number; hours: number; rides: number}[];
  months: {year: number; month: number; distance: number}[];
  gear: {name: string; distance: number; rides: number}[];
  startHours: Named[];
  weekdays: Named[];
  sports: {type: string; rides: number; distance: number}[];
  records: {key: string; heading: string; unit: string; rides: Record_[]}[];
  npeloton: {rides: number; distance: number; groups: Named[]; finishes: Named[]};
  ftp: {date: string; label: string; power: number; wattsPerKilo: number; weight: number}[];
  maintenance: {total: number; byType: Named[]};
  spending: {count: number; total: number; centsPerKm: number | null};
  conditions: {temperatures: Named[]; devices: Named[]; heartRates: Named[]; places: Named[]};
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

const median = (values: number[]): number => {
  if (0 === values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.floor(sorted.length / 2)];
};

// "(GMT+01:00) Europe/Paris" is the shape Strava sends.
const placeName = (timezone: string): string => (timezone.split(') ').at(-1) ?? timezone).split('/').at(-1) ?? timezone;

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

const toSorted = (counts: Record<string, number>, limit?: number): Named[] => {
  const entries = Object.entries(counts)
    .map(([name, value]) => ({name, value}))
    .sort((a, b) => b.value - a.value);

  return undefined === limit ? entries : entries.slice(0, limit);
};

const topRides = (
  activities: DetailedActivity[],
  getValue: (activity: DetailedActivity) => number | undefined,
  count = 3,
): Record_[] =>
  activities
    .map(activity => ({activity, value: getValue(activity) ?? 0}))
    .filter(({value}) => 0 < value)
    .sort((a, b) => b.value - a.value)
    .slice(0, count)
    .map(({activity, value}) => ({
      name: activity.name,
      date: utcDate(activity).toLocaleDateString('fr-FR'),
      value,
    }));

// Everything comes from the records cached in Redis, so the page never calls Strava
// and is not affected by its rate limit. Run scripts/backfill-activities.mjs to fill it.
const computeDashboard = (
  activities: DetailedActivity[],
  events: Event[],
  ftpTests: FTPTest[],
  expenses: BikeExpense[],
  label: GetLabel,
): Dashboard => {
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

  const npRides = sorted.filter(({name}) => name.includes('N-Peloton'));
  const npGroups = countBy(npRides, activity => extractNPGroup(activity.name, activity));

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
      firstDate: sorted.at(0) ? utcDate(sorted[0]).toLocaleDateString('fr-FR') : null,
      lastDate: sorted.at(-1) ? utcDate(sorted[sorted.length - 1]).toLocaleDateString('fr-FR') : null,
    },
    years,
    months,
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
      {key: 'distance', heading: 'Longest', unit: 'km', rides: topRides(sorted, a => a.distance / 1000)},
      {key: 'elevation', heading: 'Most climbing', unit: 'm', rides: topRides(sorted, a => a.total_elevation_gain)},
      {key: 'suffer', heading: 'Hardest', unit: '', rides: topRides(sorted, a => a.suffer_score)},
      {key: 'kudos', heading: 'Most kudos', unit: '', rides: topRides(sorted, a => a.kudos_count)},
      {key: 'power', heading: 'Biggest spike', unit: 'W', rides: topRides(sorted, a => a.max_watts)},
      {
        key: 'calories',
        heading: 'Most calories',
        unit: 'kcal',
        rides: topRides(sorted, ({calories}) => calories),
      },
      {key: 'speed', heading: 'Fastest', unit: 'km/h', rides: topRides(sorted, ({max_speed}) => (max_speed ?? 0) * 3.6)},
      {key: 'height', heading: 'Highest point', unit: 'm', rides: topRides(sorted, ({elev_high}) => elev_high)},
      {
        key: 'company',
        heading: 'Biggest group',
        unit: 'riders',
        rides: topRides(sorted, ({athlete_count}) => (1 < (athlete_count ?? 1) ? athlete_count : 0)),
      },
    ],
    ftp: [...ftpTests]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(test => ({
        date: new Date(test.date).toLocaleDateString('fr-FR'),
        label: new Date(test.date).toLocaleDateString('en-US', {month: 'short', year: '2-digit'}),
        power: test.ftp,
        wattsPerKilo: Math.round((test.ftp / test.weight) * 100) / 100,
        weight: test.weight,
      })),
    npeloton: {
      rides: npRides.length,
      distance: sum(npRides.map(({distance}) => distance)),
      groups: toSorted(npGroups),
      finishes: toSorted(computeFinishCount(sorted), 10),
    },
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
      places: toSorted(countBy(sorted, ({timezone}) => placeName(timezone ?? 'unknown')), 8),
    },
  };
};

export {computeDashboard};
export type {Dashboard};
