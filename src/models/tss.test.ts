import {buildActivity, buildDetailedActivity} from '../../test/test-util';
import {ActivityType} from './strava';
import {computeTSS, effortPower, intensityOf} from './tss';

const hour = buildActivity({moving_time: 3600, weighted_average_watts: 180, average_heartrate: 140});

describe('effort power', () => {
  it("prefers Statva's normalized power to Strava's weighted power", () => {
    expect(effortPower(hour, buildDetailedActivity({normalized_power: 200}))).toBe(200);
  });

  it('falls back on weighted power until the normalized power is in', () => {
    expect(effortPower(hour, null)).toBe(180);
    expect(effortPower(hour, buildDetailedActivity({normalized_power: null}))).toBe(180);
    expect(effortPower(buildActivity({weighted_average_watts: undefined}), null)).toBeNull();
  });
});

test("a run's power is no cycling effort: no NP, intensity or power TSS", () => {
  const run = buildActivity({sport_type: ActivityType.Run, moving_time: 3600, weighted_average_watts: 250, average_heartrate: 150});
  const detail = buildDetailedActivity({sport_type: ActivityType.Run, normalized_power: 260});

  expect(effortPower(run, detail)).toBeNull();
  expect(intensityOf(run, detail, 250)).toBeNull();
  expect(computeTSS(run, 250, detail)?.source).toBe('hr');
});

describe('intensity and TSS', () => {
  it('measure the hour by normalized power against the FTP', () => {
    const detail = buildDetailedActivity({normalized_power: 250});

    expect(intensityOf(hour, detail, 250)).toBe(1);
    // One hour at FTP is 100 TSS.
    expect(computeTSS(hour, 250, detail)).toEqual({value: 100, source: 'power'});
  });

  it('use weighted power without a normalized power, and heart rate without either', () => {
    expect(computeTSS(hour, 180)).toEqual({value: 100, source: 'power'});
    expect(intensityOf(hour, null, 0)).toBeNull();
    expect(computeTSS(buildActivity({moving_time: 3600, average_heartrate: 150, weighted_average_watts: undefined}), 250)?.source).toBe('hr');
  });
});
