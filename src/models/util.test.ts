import {dateSearchHaystack, getMonday, getMonthDiff, getWeekNumber, normalizeString} from './util';

test.each([
  [new Date('2024-02-03'), new Date('2024-02-28'), 0],
  [new Date('2024-02-03'), new Date('2024-03-04'), 1],
  [new Date('2024-02-03'), new Date('2024-03-01'), 1],
  [new Date('2024-02-03'), new Date('2024-07-01'), 5],
  [new Date('2024-02-03'), new Date('2025-07-01'), 17],
])('it can get the diff between two months', (date1, date2, expected) => {
  expect(getMonthDiff(date1, date2)).toEqual(expected);
});

test.each([
  [new Date('2024-01-01'), 1],
  [new Date('2024-01-07'), 1],
  [new Date('2024-01-08'), 2],
  [new Date('2024-01-14'), 2],
  [new Date('2024-01-15'), 3],
  [new Date('2024-04-21'), 16],
  [new Date('2024-12-29'), 52],
  [new Date('2024-12-31'), 1],
])('it can get the week number for a date', (date, expected) => {
  expect(getWeekNumber(date)).toEqual(expected);
});

test.each([
  [new Date('2025-03-09T12:00:00.000+00:00'), new Date('2025-03-03T12:00:00.000+00:00')],
  [new Date('2025-03-10'), new Date('2025-03-10')],
  [new Date('2025-03-11'), new Date('2025-03-10')],
  [new Date('2025-03-13'), new Date('2025-03-10')],
])('it can get monday for a date', (date, expected) => {
  expect(getMonday(date)).toEqual(expected);
});

// Local date parts (month is 0-indexed) so the test is timezone-independent.
const NOV_2_2024 = new Date(2024, 10, 2);

test.each([
  ['november 2', true],
  ['2 november', true],
  ['nov 2', true],
  ['2 nov', true],
  ['november 2024', true],
  ['november 2 2024', true],
  ['2024-11-02', true],
  ['02/11/2024', true],
  ['december 2', false],
  ['november 3', false],
  ['2023', false],
])('date "%s" matches Nov 2 2024 haystack: %s', (query, expected) => {
  expect(dateSearchHaystack(NOV_2_2024).includes(normalizeString(query))).toBe(expected);
});
