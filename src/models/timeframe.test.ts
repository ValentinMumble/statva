import {generatePeriodKeys} from './timeframe';

test('it can generate period keys for months', () => {
  expect(generatePeriodKeys(new Date('2023-10-03'), new Date('2024-03-07'), 'month')).toEqual({
    '2023/1': 0,
    '2023/2': 0,
    '2023/3': 0,
    '2023/4': 0,
    '2023/5': 0,
    '2023/6': 0,
    '2023/7': 0,
    '2023/8': 0,
    '2023/9': 0,
    '2023/10': 0,
    '2023/11': 0,
    '2023/12': 0,
    '2024/1': 0,
    '2024/2': 0,
    '2024/3': 0,
  });
});

test('it can generate period keys for weeks, with a specific empty value', () => {
  expect(generatePeriodKeys(new Date('2024-01-03'), new Date('2024-02-07'), 'week', null)).toEqual({
    '2024-1': null,
    '2024-2': null,
    '2024-3': null,
    '2024-4': null,
    '2024-5': null,
    '2024-6': null,
  });
});

test('it can generate period keys for days', () => {
  expect(generatePeriodKeys(new Date('2024-01-03'), new Date('2024-01-13'), 'day')).toEqual({
    '2024/01/01': 0,
    '2024/01/02': 0,
    '2024/01/03': 0,
    '2024/01/04': 0,
    '2024/01/05': 0,
    '2024/01/06': 0,
    '2024/01/07': 0,
    '2024/01/08': 0,
    '2024/01/09': 0,
    '2024/01/10': 0,
    '2024/01/11': 0,
    '2024/01/12': 0,
    '2024/01/13': 0,
  });
});
