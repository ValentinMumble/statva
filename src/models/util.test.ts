import {getMonthDiff, getWeekNumber} from './util';

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
