/**
 * Normalized power as Sauce for Strava works it out (its calcNP and correctedPower), so it
 * matches what riders have been copying from Sauce into their notes. The textbook formula
 * (30-second rolling average, 4th power, mean, 4th root) runs on a one-second series where
 * stops are zeros that do not count: a café stop does not dilute the number, coasting does.
 */

type PowerStreams = {
  time: number[];
  watts: number[];
  moving?: boolean[];
  cadence?: number[];
  distance?: number[];
  heartrate?: number[];
};

type Point = {watts: number; padding: boolean; heartRate?: number};

/** What the server keeps from a ride's power data, next to its details. */
type PowerAnalysis = {
  normalizedPower: number | null;
  // Best average power over each duration, in seconds (only durations the ride lasted).
  curve: Record<number, number>;
  // Moving seconds spent in each band of POWER_BAND watts, from 0 W up.
  histogram: number[];
  // How much heart rate drifted against power from the first half to the second, in percent
  // (positive: more heart rate for the same power later on). Long rides with both only.
  heartRateDrift: number | null;
};

// Sauce gives no NP under five minutes (Coggan's own minimum is twenty).
const MIN_SECONDS = 300;
const WINDOW_SECONDS = 30;
// Beyond this gap between two points the rider is taken as stopped (Sauce's maxImmobileGap).
const MAX_IMMOBILE_GAP = 75;
// 1 mph, the slowest speed Sauce counts as moving.
const MIN_SPEED = 0.447;
const CURVE_SECONDS = [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];
const POWER_BAND = 25;
// Drift only means something over a long steady effort, as in Friel's Pw:HR decoupling.
const DRIFT_MIN_SECONDS = 3600;

const mostCommon = (values: number[]): number => {
  const counts = new Map<number, number>();
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1));

  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ?? 1;
};

/** Which points the rider was moving at (Sauce's createActiveStream, power meter assumed). */
const activePoints = ({time, watts, moving, cadence, distance}: PowerStreams, isTrainer: boolean): boolean[] => {
  const hasDistance = Boolean(distance && distance[distance.length - 1]);
  // Trainers with a distance mark every point as moving, so that flag says nothing there.
  const useMoving = !(isTrainer && hasDistance);

  return time.map((_, index) => {
    const gap = 0 < index ? time[index] - time[index - 1] : 0;

    return (
      0 < gap &&
      (0 === index || gap < MAX_IMMOBILE_GAP) &&
      Boolean(
        watts[index] ||
          (useMoving && moving?.[index]) ||
          (isTrainer && cadence?.[index]) ||
          (hasDistance && distance && (distance[index] - distance[index - 1]) / gap >= MIN_SPEED),
      )
    );
  });
};

/** One point per step: stops become zeros marked as padding, short gaps repeat the next value. */
const resample = (streams: PowerStreams, isTrainer: boolean): {series: Point[]; step: number} => {
  const {time, watts, heartrate} = streams;
  const step = mostCommon(time.slice(1).map((value, index) => value - time[index]));
  const active = activePoints(streams, isTrainer);
  const series: Point[] = [];

  time.forEach((seconds, index) => {
    const gap = 0 < index ? seconds - time[index - 1] : 0;
    const point = {watts: watts[index] ?? 0, padding: false, heartRate: heartrate?.[index]};

    for (let offset = step; offset < gap; offset += step) series.push(active[index] ? point : {watts: 0, padding: true});
    series.push(point);
  });

  return {series, step};
};

/** Sauce's NP over the resampled points, or null when there is too little data for one. */
const normalizedOf = (series: Point[], step: number): number | null => {
  if (series.length * step < MIN_SECONDS) return null;

  const size = Math.round(WINDOW_SECONDS / step);
  let sum = 0;
  let total = 0;
  let count = 0;

  series.forEach(({watts: value, padding}, index) => {
    sum += value - (index >= size ? series[index - size].watts : 0);

    if (index + 1 >= size) {
      const average = sum / size;
      total += average ** 4;
      // A window that is nothing but a stop does not count.
      if (average || !padding) count++;
    }
  });

  return total > 1 ? Math.round((total / count) ** 0.25) : null;
};

/** The best rolling average over each duration the ride is long enough for. */
const curveOf = (series: Point[], step: number): Record<number, number> => {
  const curve: Record<number, number> = {};

  for (const seconds of CURVE_SECONDS) {
    const size = Math.round(seconds / step);
    if (size < 1 || size > series.length) break;

    let sum = 0;
    let best = 0;
    series.forEach(({watts}, index) => {
      sum += watts - (index >= size ? series[index - size].watts : 0);
      if (index + 1 >= size) best = Math.max(best, sum / size);
    });
    curve[seconds] = Math.round(best);
  }

  return curve;
};

const histogramOf = (series: Point[], step: number): number[] => {
  const histogram: number[] = [];

  for (const {watts, padding} of series) {
    if (padding) continue;
    const band = Math.floor(Math.max(0, watts) / POWER_BAND);
    histogram[band] = (histogram[band] ?? 0) + step;
  }

  return Array.from(histogram, seconds => seconds ?? 0);
};

/** Power to heart rate in the first half of the moving time against the second. */
const driftOf = (series: Point[], step: number): number | null => {
  const moving = series.filter(({padding, heartRate}) => !padding && undefined !== heartRate && 0 < heartRate);

  if (moving.length * step < DRIFT_MIN_SECONDS) return null;

  const ratio = (points: Point[]) => {
    const average = (pick: (point: Point) => number) => points.reduce((sum, point) => sum + pick(point), 0) / points.length;

    return average(({watts}) => watts) / average(({heartRate}) => heartRate ?? 0);
  };
  const half = Math.floor(moving.length / 2);
  const first = ratio(moving.slice(0, half));
  const second = ratio(moving.slice(half));

  return 0 < first ? Math.round(((first - second) / first) * 1000) / 10 : null;
};

/** Everything worked out from a ride's power data, or null without enough of it. */
const analysePower = (streams: PowerStreams, isTrainer = false): PowerAnalysis | null => {
  if (streams.time.length < 2 || streams.time.length !== streams.watts.length) return null;

  const {series, step} = resample(streams, isTrainer);

  return {
    normalizedPower: normalizedOf(series, step),
    curve: curveOf(series, step),
    histogram: histogramOf(series, step),
    heartRateDrift: driftOf(series, step),
  };
};

/** The normalized power alone, as Sauce shows it. */
const normalizedPower = (streams: PowerStreams, isTrainer = false): number | null => analysePower(streams, isTrainer)?.normalizedPower ?? null;

export {analysePower, normalizedPower, POWER_BAND};
export type {PowerAnalysis, PowerStreams};
