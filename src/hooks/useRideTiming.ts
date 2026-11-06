import {useMemo, useState} from 'react';
import {climbing, Pace, RoutePoint} from '../models';
import {deviceDay} from '../models/local-day';

/** The next full hour, as the start offered first. */
const nextHour = (): Date => {
  const date = new Date(Date.now() + 3600000);
  date.setMinutes(0, 0, 0);
  return date;
};

/**
 * When a planned ride starts and how fast it goes: a day, a time and an average speed, on top
 * of a pace (the rider's own, or the one a shared ride came with). The speed scales the whole
 * pace, so the ride stays slower on the climbs; null keeps the pace's own speed.
 */
const useRideTiming = (points: RoutePoint[], basePace: Pace, firstStart: number | null = null) => {
  const [first] = useState(() => (null === firstStart ? nextHour() : new Date(firstStart)));
  const [startDay, setStartDay] = useState(deviceDay(first));
  const [startTime, setStartTime] = useState(
    `${String(first.getHours()).padStart(2, '0')}:${String(first.getMinutes()).padStart(2, '0')}`,
  );
  const [speed, setSpeed] = useState<number | null>(null);

  const distance = points.at(-1)?.distance ?? 0;
  const climb = useMemo(() => climbing(points), [points]);
  const baseTime = distance * basePace.secondsPerMetre + climb * basePace.secondsPerMetreClimbed;
  const ownSpeed = 0 < baseTime ? (distance / baseTime) * 3.6 : 25;
  const average = speed ?? ownSpeed;
  const scale = ownSpeed / average;
  const pace = useMemo(
    () => ({
      secondsPerMetre: basePace.secondsPerMetre * scale,
      secondsPerMetreClimbed: basePace.secondsPerMetreClimbed * scale,
    }),
    [basePace.secondsPerMetre, basePace.secondsPerMetreClimbed, scale],
  );

  return {
    startDay,
    setStartDay,
    startTime,
    setStartTime,
    speed,
    setSpeed,
    ownSpeed,
    average,
    pace,
    start: new Date(`${startDay}T${startTime}`).getTime(),
  };
};

type RideTiming = ReturnType<typeof useRideTiming>;

export {useRideTiming};
export type {RideTiming};
