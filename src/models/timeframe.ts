import {getWeekNumber} from './util';

type Timeframe = 'day' | 'month' | 'week';

type TimeframeData = {
  initialItemCount: number;
  maxValue: number;
  separator: string;
  getDatePeriod: (date: Date) => number;
  getPeriodKey: (date: Date) => string;
};

const TIMEFRAMES: {[key: string]: TimeframeData} = {
  day: {
    initialItemCount: 30,
    maxValue: 365,
    separator: '/',
    getDatePeriod: date => date.getUTCDate(),
    getPeriodKey: date => date.toLocaleDateString('en-ZA'),
  },
  week: {
    initialItemCount: 26,
    maxValue: 52,
    separator: '-',
    getDatePeriod: date => getWeekNumber(date),
    getPeriodKey: date => `${date.getUTCFullYear()}${TIMEFRAMES.week.separator}${getWeekNumber(date)}`,
  },
  month: {
    initialItemCount: 15,
    maxValue: 12,
    separator: '/',
    getDatePeriod: date => date.getUTCMonth() + 1,
    getPeriodKey: date => `${date.getUTCFullYear()}${TIMEFRAMES.month.separator}${date.getUTCMonth() + 1}`,
  },
};

const generatePeriodKeys = (firstDate: Date, lastDate: Date, timeframe: Timeframe, emptyValue: number | null = 0) => {
  const emptyValues: {[period: string]: any} = {};
  const {maxValue, getDatePeriod, separator} = TIMEFRAMES[timeframe];

  for (let year = firstDate.getUTCFullYear(); year <= lastDate.getUTCFullYear(); year++) {
    let maxPeriod = maxValue;
    maxPeriod = year === lastDate.getUTCFullYear() ? getDatePeriod(lastDate) : maxPeriod;

    if ('day' === timeframe) {
      for (let month = 1; month <= TIMEFRAMES['month'].maxValue; month++) {
        for (let day = 1; day <= maxPeriod; day++) {
          emptyValues[`${year}${separator}${month}${separator}${day}`] = emptyValue;
        }
      }
    } else {
      for (let period = 1; period <= maxPeriod; period++) {
        emptyValues[`${year}${separator}${period}`] = emptyValue;
      }
    }
  }

  return emptyValues;
};

export {generatePeriodKeys, TIMEFRAMES};
export type {Timeframe};
