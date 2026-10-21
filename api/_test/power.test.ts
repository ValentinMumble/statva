import {analysePower, normalizedPower} from '../_lib/power.js';

const seconds = (count: number, from = 0) => Array.from({length: count}, (_, index) => from + index);

// The textbook formula on a one-second series with no stops, to check against.
const textbook = (watts: number[]) => {
  const averages = watts
    .slice(29)
    .map((_, index) => watts.slice(index, index + 30).reduce((sum, value) => sum + value, 0) / 30);

  return Math.round((averages.reduce((sum, average) => sum + average ** 4, 0) / averages.length) ** 0.25);
};

describe('normalized power', () => {
  it('is the steady power for a steady ride', () => {
    expect(normalizedPower({time: seconds(600), watts: Array(600).fill(200)})).toBe(200);
  });

  it('is the textbook value for a ride without stops', () => {
    // Alternating minutes at 100 and 300 W.
    const watts = seconds(1200).map(second => (Math.floor(second / 60) % 2 ? 300 : 100));

    expect(normalizedPower({time: seconds(1200), watts})).toBe(textbook(watts));
  });

  it('leaves a stop out instead of counting it as zero watts', () => {
    // Ten minutes at 200 W, a ten-minute stop with nothing recorded, ten more minutes.
    const time = [...seconds(600), ...seconds(600, 1200)];
    const watts = Array(1200).fill(200);
    const moving = time.map(() => true);
    const withStop = normalizedPower({time, watts, moving});
    const stopAsZeros = normalizedPower({
      time: seconds(1800),
      watts: [...Array(600).fill(200), ...Array(600).fill(0), ...Array(600).fill(200)],
    });

    expect(withStop).toBeGreaterThan(195);
    expect(withStop).toBeGreaterThan(Number(stopAsZeros));
  });

  it('counts coasting while moving', () => {
    const time = seconds(1200);
    const watts = time.map(second => (second < 600 ? 250 : 0));
    const moving = time.map(() => true);

    expect(normalizedPower({time, watts, moving})).toBe(textbook(watts));
  });

  it('finds the best average power over each duration the ride lasted', () => {
    // Easy at 150 W, with one 5-minute block at 300 W.
    const time = seconds(1200);
    const watts = time.map(second => (second >= 600 && second < 900 ? 300 : 150));
    const curve = analysePower({time, watts})?.curve;

    expect(curve).toMatchObject({5: 300, 60: 300, 300: 300, 1200: 188});
    expect(curve?.[3600]).toBeUndefined();
  });

  it('counts moving seconds per 25 W band, stops left out', () => {
    const time = [...seconds(400), ...seconds(400, 1000)];
    const watts = time.map(second => (second < 1000 ? 110 : 260));
    const histogram = analysePower({time, watts, moving: time.map(() => true)})?.histogram ?? [];

    expect(histogram[4]).toBe(400);
    expect(histogram[10]).toBe(400);
    expect(histogram.reduce((sum, value) => sum + value, 0)).toBe(800);
  });

  it('measures heart rate drift on long rides only', () => {
    const time = seconds(4000);
    const watts = time.map(() => 200);
    // Heart rate creeps up from 140 to 150 bpm for the same power.
    const heartrate = time.map(second => (second < 2000 ? 140 : 150));

    expect(analysePower({time, watts, heartrate})?.heartRateDrift).toBe(6.7);
    expect(
      analysePower({time: seconds(1800), watts: watts.slice(0, 1800), heartrate: heartrate.slice(0, 1800)})
        ?.heartRateDrift,
    ).toBeNull();
  });

  it('gives nothing under five minutes or without data', () => {
    expect(normalizedPower({time: seconds(200), watts: Array(200).fill(300)})).toBeNull();
    expect(normalizedPower({time: [], watts: []})).toBeNull();
  });
});
