import {heartRateZoneTimes} from './heart-rate-zones';

describe('heartRateZoneTimes', () => {
  const thresholds = [120, 140, 160, 180];

  it('counts the seconds in each of the rider zones, moving only', () => {
    const time = [0, 10, 20, 30, 40, 50, 60];
    const heartrate = [100, 110, 130, 150, 150, 170, 190];
    const moving = [true, true, true, true, false, true, true];

    expect(
      heartRateZoneTimes({time: {data: time}, heartrate: {data: heartrate}, moving: {data: moving}}, thresholds),
    ).toEqual([
      {min: 0, max: 120, time: 10},
      {min: 120, max: 140, time: 10},
      {min: 140, max: 160, time: 10},
      {min: 160, max: 180, time: 10},
      {min: 180, max: -1, time: 10},
    ]);
  });

  it('leaves out the time a device paused itself', () => {
    const zones = heartRateZoneTimes({time: {data: [0, 10, 600]}, heartrate: {data: [130, 130, 130]}}, thresholds);

    expect(zones?.[1].time).toBe(10);
  });

  it('has nothing without heart rate', () => {
    expect(heartRateZoneTimes({time: {data: [0, 10]}}, thresholds)).toBeNull();
    expect(heartRateZoneTimes({}, thresholds)).toBeNull();
  });
});
