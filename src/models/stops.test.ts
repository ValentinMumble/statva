import {findStops} from './stops';

// A point a second, at a place that moves east a little each second, from 0 to the given end.
const ride = (end: number) => ({
  time: Array.from({length: end + 1}, (_, second) => second),
  latlng: Array.from({length: end + 1}, (_, second) => [45.9, 6.1 + second / 10000] as [number, number]),
  moving: Array.from({length: end + 1}, () => true),
});

describe('findStops', () => {
  it('finds where the rider stood still for 2 minutes or more, and for how long', () => {
    const streams = ride(1000);
    // Standing still from 300 to 500 s, and for 60 s from 700: too short to count.
    for (let second = 301; second <= 500; second++) streams.moving[second] = false;
    for (let second = 701; second <= 760; second++) streams.moving[second] = false;

    const stops = findStops({
      time: {data: streams.time},
      latlng: {data: streams.latlng},
      moving: {data: streams.moving},
    });

    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({start: 300, duration: 200, lat: 45.9});
    expect(stops[0].lng).toBeCloseTo(6.13);
  });

  it('counts a device that paused itself as a stop', () => {
    const streams = ride(100);
    // A café: the device paused, the next point comes 15 minutes later.
    const time = streams.time.map(second => (second > 50 ? second + 900 : second));

    expect(findStops({time: {data: time}, latlng: {data: streams.latlng}})).toEqual([
      {lat: 45.9, lng: 6.1 + 50 / 10000, start: 50, duration: 901},
    ]);
  });

  it('finds none without positions, as indoors', () => {
    expect(findStops({time: {data: [0, 1000]}})).toEqual([]);
    expect(findStops({})).toEqual([]);
  });
});
