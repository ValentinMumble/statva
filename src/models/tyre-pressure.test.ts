import {tyrePressure} from './tyre-pressure';

describe('tyrePressure', () => {
  it("gives Berto's 15% drop pressures, the rear higher", () => {
    // 74 kg rider, 8 kg bike, 2 kg of kit, on 28 mm tyres with inner tubes.
    expect(tyrePressure(84, 28, false)).toEqual({front: 60, rear: 74, frontBar: 4.1, rearBar: 5.1, outOfRange: false});
  });

  it('runs lower on wider tyres and with tubeless', () => {
    const tubes = tyrePressure(84, 32, false);
    const tubeless = tyrePressure(84, 32, true);

    expect(tubes.rear).toBeLessThan(tyrePressure(84, 28, false).rear);
    expect(tubeless.rear).toBeLessThan(tubes.rear);
  });

  it('flags tyres narrower than the chart covers', () => {
    expect(tyrePressure(84, 21, false).outOfRange).toBe(true);
  });
});
