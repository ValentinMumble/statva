import {ActivityStreams} from './stops';

/**
 * Time in each heart rate zone, worked out from an activity's recorded points and the rider's
 * own zones (Settings), rather than asked of Strava, which gives zones to subscribers only.
 */

// A zone's range in bpm (max -1: no upper end) and the seconds spent in it, as Strava gives them.
type ZoneTime = {min: number; max: number; time: number};

// Longer than this between two points (s), the device paused itself: that time is not counted.
const PAUSE_GAP = 30;

/** Seconds in each zone, moving time only, or null without heart rate points. */
const heartRateZoneTimes = ({time, heartrate, moving}: ActivityStreams, thresholds: number[]): ZoneTime[] | null => {
  const times = time?.data ?? [];
  const beats = heartrate?.data ?? [];
  if (times.length < 2 || beats.length !== times.length) return null;

  const limits = [0, ...thresholds];
  const zones: ZoneTime[] = limits.map((min, index) => ({min, max: limits[index + 1] ?? -1, time: 0}));
  for (let index = 1; index < times.length; index++) {
    const gap = times[index] - times[index - 1];
    if (gap > PAUSE_GAP || false === moving?.data[index] || 0 === beats[index]) continue;
    const zone = thresholds.filter(threshold => beats[index] >= threshold).length;
    zones[zone].time += gap;
  }

  return zones.some(({time: seconds}) => 0 < seconds) ? zones : null;
};

export {heartRateZoneTimes};
export type {ZoneTime};
