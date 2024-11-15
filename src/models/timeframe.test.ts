import {buildActivity} from '../../test/test-util';
import {buildPeriodMap, generatePeriodKeys} from './timeframe';

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
  expect(generatePeriodKeys(new Date('2024-02-03'), new Date('2024-02-20'), 'week', null)).toEqual({
    '2024-1': null,
    '2024-2': null,
    '2024-3': null,
    '2024-4': null,
    '2024-5': null,
    '2024-6': null,
    '2024-7': null,
    '2024-8': null,
  });
});

test.only('it can generate period keys for days', () => {
  expect(generatePeriodKeys(new Date('2024-05-08'), new Date('2024-10-23'), 'day')).toEqual({
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

test('it can build a period map for months', () => {
  const activities = [
    buildActivity({start_date: '2024-03-01', distance: 1000}),
    buildActivity({start_date: '2024-05-01', distance: 2000}),
    buildActivity({start_date: '2024-05-02', distance: 2000}),
    buildActivity({start_date: '2024-07-01', distance: 3000}),
  ];

  expect(buildPeriodMap(activities, 'month', 'distance', 10)).toEqual({
    '2024/1': 0,
    '2024/2': 0,
    '2024/3': 1000,
    '2024/4': 0,
    '2024/5': 4000,
    '2024/6': 0,
    '2024/7': 3000,
  });
});

test('it can build a period map for weeks', () => {
  const activities = [
    buildActivity({start_date: '2024-01-20', distance: 1000}),
    buildActivity({start_date: '2024-02-03', distance: 2000}),
    buildActivity({start_date: '2024-02-04', distance: 2000}),
    buildActivity({start_date: '2024-03-02', distance: 3000}),
  ];

  expect(buildPeriodMap(activities, 'week', 'distance', 10)).toEqual({
    '2024-1': 0,
    '2024-2': 0,
    '2024-3': 1000,
    '2024-4': 0,
    '2024-5': 4000,
    '2024-6': 0,
    '2024-7': 0,
    '2024-8': 0,
    '2024-9': 3000,
  });
});

test('it can build a period map for days', async () => {
  const activities = [
    buildActivity({start_date: '2024-02-20', distance: 1000}),
    buildActivity({start_date: '2024-02-20', distance: 1000}),
    buildActivity({start_date: '2024-03-02', distance: 3000}),
  ];

  expect(buildPeriodMap(activities, 'day', 'distance', 13)).toEqual({
    '2024/02/19': 0,
    '2024/02/20': 2000,
    '2024/02/21': 0,
    '2024/02/22': 0,
    '2024/02/23': 0,
    '2024/02/24': 0,
    '2024/02/25': 0,
    '2024/02/26': 0,
    '2024/02/27': 0,
    '2024/02/28': 0,
    '2024/02/29': 0,
    '2024/03/01': 0,
    '2024/03/02': 3000,
  });
});
