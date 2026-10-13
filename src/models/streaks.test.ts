import {buildDetailedActivity} from '../../test/test-util';
import {computeStreaks, longestStreak} from './streaks';

// Only the local start matters here; the UTC one is a few hours off on purpose.
const on = (day: string, hour = '10:00') =>
  buildDetailedActivity({start_date: `${day}T05:00:00Z`, start_date_local: `${day}T${hour}:00Z`});

describe('longestStreak', () => {
  it('counts the longest run of days in a row', () => {
    expect(longestStreak(['2024-05-01', '2024-05-02', '2024-05-03', '2024-05-03', '2024-06-20'])).toBe(3);
  });

  it('is zero without any day', () => {
    expect(longestStreak([])).toBe(0);
  });
});

describe('computeStreaks', () => {
  const activities = [
    on('2026-09-01'),
    on('2026-09-02'),
    on('2026-09-03'),
    // two on the same day count once
    on('2026-09-03', '18:00'),
    on('2026-09-20'),
    on('2026-10-11'),
    on('2026-10-12'),
  ];

  it('finds the longest run of days and its dates', () => {
    expect(computeStreaks(activities, '2026-10-13').longestDays).toEqual({length: 3, from: '2026-09-01', to: '2026-09-03'});
  });

  it('keeps the current streak going when today has nothing yet', () => {
    expect(computeStreaks(activities, '2026-10-13').currentDays).toEqual({length: 2, from: '2026-10-11', to: '2026-10-12'});
  });

  it('drops the current streak after a day off', () => {
    expect(computeStreaks(activities, '2026-10-14').currentDays.length).toBe(0);
  });

  it('counts weeks from Monday', () => {
    // 1 Sept 2026 is a Tuesday, so its week starts on 31 August; 11 Oct is a Sunday, 12 Oct a Monday.
    const {longestWeeks, currentWeeks} = computeStreaks(activities, '2026-10-13');

    expect(longestWeeks).toEqual({length: 2, from: '2026-10-05', to: '2026-10-18'});
    expect(currentWeeks).toEqual({length: 2, from: '2026-10-05', to: '2026-10-18'});
  });

  it('keeps the week streak through a week with nothing yet', () => {
    expect(computeStreaks(activities, '2026-10-19').currentWeeks.length).toBe(2);
    expect(computeStreaks(activities, '2026-10-26').currentWeeks.length).toBe(0);
  });

  it('finds the longest break between two activities', () => {
    expect(computeStreaks(activities, '2026-10-13').longestBreak).toEqual({length: 20, from: '2026-09-20', to: '2026-10-11'});
  });

  it('reads the local day, not the UTC one', () => {
    const lateRide = buildDetailedActivity({start_date: '2026-10-12T22:30:00Z', start_date_local: '2026-10-13T00:30:00Z'});

    expect(computeStreaks([lateRide], '2026-10-13').currentDays).toEqual({length: 1, from: '2026-10-13', to: '2026-10-13'});
  });

  it('is empty without activities', () => {
    const empty = {length: 0, from: null, to: null};

    expect(computeStreaks([], '2026-10-13')).toEqual({
      longestDays: empty,
      currentDays: empty,
      longestWeeks: empty,
      currentWeeks: empty,
      longestBreak: empty,
    });
  });
});
