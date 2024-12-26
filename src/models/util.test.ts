import {getMonthDiff} from './util';

test.each([
  [new Date('2024-02-03'), new Date('2024-02-28'), 0],
  [new Date('2024-02-03'), new Date('2024-03-04'), 1],
  [new Date('2024-02-03'), new Date('2024-03-01'), 1],
  [new Date('2024-02-03'), new Date('2024-07-01'), 5],
  [new Date('2024-02-03'), new Date('2025-07-01'), 17],
])('it can get the diff between two months', (date1, date2, expected) => {
  expect(getMonthDiff(date1, date2)).toEqual(expected);
});
