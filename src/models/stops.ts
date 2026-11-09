/**
 * Where an activity stopped: from its recorded points, the stretches where the rider was not
 * moving (Strava's own "moving" flag), and the gaps a device leaves while it pauses itself.
 */

// An activity's points as Strava gives them, by type: seconds from the start, positions, and
// whether the rider was moving at each.
type ActivityStreams = {
  time?: {data: number[]};
  latlng?: {data: [number, number][]};
  moving?: {data: boolean[]};
};

type Stop = {
  lat: number;
  lng: number;
  // Seconds from the activity's start to the stop, and how long it lasted.
  start: number;
  duration: number;
};

// Longer than this between two points (s), the device paused itself: the rider was stopped.
const PAUSE_GAP = 30;
// Stops shorter than this (s) are traffic lights and the like, left out.
const MIN_STOP = 120;

/** The stops of 2 minutes or more, in order, each where it began. None without positions. */
const findStops = ({time, latlng, moving}: ActivityStreams, minimum = MIN_STOP): Stop[] => {
  const times = time?.data ?? [];
  const places = latlng?.data ?? [];
  if (times.length < 2 || places.length !== times.length) return [];

  const stops: Stop[] = [];
  let current: Stop | null = null;
  const close = () => {
    if (null !== current && current.duration >= minimum) stops.push(current);
    current = null;
  };

  for (let index = 1; index < times.length; index++) {
    const gap = times[index] - times[index - 1];
    if (gap > PAUSE_GAP || false === moving?.data[index]) {
      current ??= {lat: places[index - 1][0], lng: places[index - 1][1], start: times[index - 1], duration: 0};
      current.duration += gap;
    } else {
      close();
    }
  }
  close();

  return stops;
};

export {findStops, MIN_STOP};
export type {ActivityStreams, Stop};
