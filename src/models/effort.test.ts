import {buildActivity, buildDetailedActivity} from '../../test/test-util';
import {extractNormalizedPower} from './activity-meta';
import {effortPower, intensityOf} from './effort';
import {ActivityType} from './strava';

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

test("a run's power is no cycling effort: no effort power or intensity", () => {
  const run = buildActivity({sport_type: ActivityType.Run, moving_time: 3600, weighted_average_watts: 250});
  const detail = buildDetailedActivity({sport_type: ActivityType.Run, normalized_power: 260});

  expect(effortPower(run, detail)).toBeNull();
  expect(intensityOf(run, detail, 250)).toBeNull();
});

test('intensity is the effort power against the FTP of the day', () => {
  expect(intensityOf(hour, buildDetailedActivity({normalized_power: 250}), 250)).toBe(1);
  expect(intensityOf(hour, null, 0)).toBeNull();
});

test('an activity whose details have not arrived has no normalized power, rather than crashing', () => {
  expect(extractNormalizedPower(undefined)).toBeNull();
  expect(extractNormalizedPower(null)).toBeNull();
});
