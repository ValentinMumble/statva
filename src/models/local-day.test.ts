import {buildDetailedActivity} from '../../test/test-util';
import {
  dayFromNumber,
  dayNumber,
  deviceDay,
  formatDay,
  formatDayRange,
  localDay,
  localHour,
  weekdayOf,
} from './local-day';

test('it reads the local day and hour, not the UTC ones', () => {
  const lateRide = buildDetailedActivity({
    start_date: '2026-10-12T22:30:00Z',
    start_date_local: '2026-10-13T00:30:00Z',
  });

  expect(localDay(lateRide)).toBe('2026-10-13');
  expect(localHour(lateRide)).toBe(0);
});

test('it steps through days across a month end', () => {
  expect(dayFromNumber(dayNumber('2024-02-28') + 1)).toBe('2024-02-29');
  expect(dayFromNumber(dayNumber('2024-02-28') + 2)).toBe('2024-03-01');
});

test('it starts the week on Monday', () => {
  expect(weekdayOf('2026-10-12')).toBe(0);
  expect(weekdayOf('2026-10-18')).toBe(6);
});

test('it reads the day on this device', () => {
  expect(deviceDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
});

test('it writes a day and a span of days', () => {
  expect(formatDay('2024-10-12', 'en-GB')).toBe('12 Oct 2024');
  expect(formatDayRange('2024-05-03', '2024-05-14', 'en-GB')).toBe('3 May to 14 May 2024');
  expect(formatDayRange('2024-12-30', '2025-01-02', 'en-GB')).toBe('30 Dec 2024 to 2 Jan 2025');
  expect(formatDayRange('2024-05-03', '2024-05-03', 'en-GB')).toBe('3 May 2024');
});
