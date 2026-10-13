import {buildDetailedActivity} from '../../test/test-util';
import {activityYears, buildCalendar, buildRideClock, heatLevel} from './calendar';

const on = (local: string, km: number) =>
  buildDetailedActivity({start_date: local, start_date_local: local, distance: km * 1000});

const activities = [
  // a Saturday
  on('2024-10-12T09:00:00Z', 45),
  on('2024-10-12T17:00:00Z', 10),
  on('2025-01-01T08:00:00Z', 20),
  // New Year's Eve late at night: still 2024 where it was ridden
  on('2024-12-31T23:30:00Z', 5),
];

describe('activityYears', () => {
  it('lists the years with activities, newest first', () => {
    expect(activityYears(activities)).toEqual([2025, 2024]);
  });
});

describe('buildCalendar', () => {
  const calendar = buildCalendar(activities, 2024);

  it('has one square per day of the year', () => {
    // 2024 is a leap year
    expect(calendar.days).toHaveLength(366);
    expect(calendar.days[0]).toMatchObject({day: '2024-01-01', column: 0, row: 0});
  });

  it('adds up each day and puts it on its weekday', () => {
    const saturday = calendar.days.find(({day}) => '2024-10-12' === day);

    expect(saturday).toMatchObject({distance: 55000, count: 2, row: 5});
    expect(calendar.max).toBe(55000);
  });

  it('keeps late rides on their local day', () => {
    expect(calendar.days.at(-1)).toMatchObject({day: '2024-12-31', distance: 5000, count: 1, row: 1});
  });

  it('starts the first column on the Monday before the first of January', () => {
    // 1 January 2025 is a Wednesday, so it sits on the third row of the first column
    const nextYear = buildCalendar(activities, 2025);

    expect(nextYear.days[0]).toMatchObject({column: 0, row: 2, distance: 20000});
    expect(nextYear.columns).toBe(53);
    expect(nextYear.months[0]).toEqual({month: 1, column: 0});
    // 1 February 2025 is a Saturday in the fifth week
    expect(nextYear.months[1]).toEqual({month: 2, column: 4});
  });
});

describe('buildRideClock', () => {
  it('counts activities by weekday and local hour', () => {
    const {counts, max} = buildRideClock(activities);

    expect(counts).toHaveLength(7);
    expect(counts[5][9]).toBe(1);
    expect(counts[5][17]).toBe(1);
    expect(counts[1][23]).toBe(1);
    expect(counts[2][8]).toBe(1);
    expect(max).toBe(1);
  });
});

describe('heatLevel', () => {
  it('shades from nothing to the biggest', () => {
    expect(heatLevel(0, 100)).toBe(0);
    expect(heatLevel(1, 100)).toBe(1);
    expect(heatLevel(50, 100)).toBe(2);
    expect(heatLevel(51, 100)).toBe(3);
    expect(heatLevel(100, 100)).toBe(4);
  });

  it('shows a day with an activity but no distance', () => {
    expect(heatLevel(0, 100, true)).toBe(1);
  });
});
