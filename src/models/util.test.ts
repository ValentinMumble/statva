import {getMonthDiff} from './util';

test('it can get the diff between two months', () => {
  expect(getMonthDiff(new Date('2024-02-03'), new Date('2024-02-28'))).toEqual(0);
  expect(getMonthDiff(new Date('2024-02-03'), new Date('2024-03-04'))).toEqual(1);
  expect(getMonthDiff(new Date('2024-02-03'), new Date('2024-03-01'))).toEqual(1);
  expect(getMonthDiff(new Date('2024-02-03'), new Date('2024-07-01'))).toEqual(5);
  expect(getMonthDiff(new Date('2024-02-03'), new Date('2025-07-01'))).toEqual(17);
});
