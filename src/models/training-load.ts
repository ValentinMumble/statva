import {GetFtp} from './ftp';
import {Activity} from './strava';
import {computeTSS} from './tss';

const CTL_DAYS = 42;
const ATL_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type DayLoad = {
  date: string;
  timestamp: number;
  // Fitness: the 42-day average of daily stress.
  ctl: number;
  // Fatigue: the 7-day average.
  atl: number;
  // Form: fitness minus fatigue. Below zero is tired, above is fresh.
  tsb: number;
};

/** Fitness, fatigue and form for every day from the first activity to today. */
const buildTrainingLoad = (activities: Activity[], getFtp: GetFtp, today: Date = new Date()): DayLoad[] => {
  const counted = activities.filter(({weighted_average_watts, average_heartrate}) => weighted_average_watts || average_heartrate);

  if (0 === counted.length) return [];

  const sorted = [...counted].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const startDate = new Date(sorted[0].start_date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setHours(0, 0, 0, 0);

  const dailyLoad: Record<string, number> = {};
  for (const activity of sorted) {
    const day = new Date(activity.start_date).toISOString().split('T')[0];
    const tss = computeTSS(activity, getFtp(new Date(activity.start_date)));
    dailyLoad[day] = (dailyLoad[day] ?? 0) + (tss?.value ?? 0);
  }

  const ctlDecay = Math.exp(-1 / CTL_DAYS);
  const atlDecay = Math.exp(-1 / ATL_DAYS);

  let ctl = 0;
  let atl = 0;
  const result: DayLoad[] = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    const dayKey = current.toISOString().split('T')[0];
    const load = dailyLoad[dayKey] ?? 0;

    ctl = ctl * ctlDecay + load * (1 - ctlDecay);
    atl = atl * atlDecay + load * (1 - atlDecay);

    result.push({
      date: dayKey,
      timestamp: current.getTime(),
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
    });

    current.setTime(current.getTime() + MS_PER_DAY);
  }

  return result;
};

export {buildTrainingLoad};
export type {DayLoad};
