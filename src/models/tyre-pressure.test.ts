import {tyrePressure, tyreWidths} from './tyre-pressure';

describe('tyreWidths', () => {
  it('reads one width for both tyres, or a front and a rear one, from what was logged', () => {
    expect(tyreWidths('28')).toEqual({front: 28, rear: 28});
    expect(tyreWidths(28)).toEqual({front: 28, rear: 28});
    expect(tyreWidths('30/32')).toEqual({front: 30, rear: 32});
    expect(tyreWidths('')).toBeNull();
    expect(tyreWidths(undefined)).toBeNull();
  });
});

describe('tyrePressure', () => {
  it("gives Berto's 15% drop pressures in bar and psi, the rear higher", () => {
    // 74 kg rider, 8 kg bike, 2 kg of kit, on 28 mm tyres with inner tubes.
    expect(tyrePressure(84, {front: 28, rear: 28}, false)).toEqual({front: 4.1, rear: 5.1, frontPsi: 60, rearPsi: 74, outOfRange: false});
  });

  it('runs lower on wider tyres and with tubeless', () => {
    const narrow = tyrePressure(84, {front: 28, rear: 28}, false);
    const wide = tyrePressure(84, {front: 30, rear: 32}, false);

    expect(wide.front).toBeLessThan(narrow.front);
    expect(wide.rear).toBeLessThan(narrow.rear);
    expect(tyrePressure(84, {front: 30, rear: 32}, true).rear).toBeLessThan(wide.rear);
  });

  it('flags tyres narrower than the chart covers', () => {
    expect(tyrePressure(84, {front: 21, rear: 23}, false).outOfRange).toBe(true);
  });
});
