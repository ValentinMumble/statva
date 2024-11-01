import {getWeekNumber} from './util';

type Timeframe = 'day' | 'month' | 'week';

type TimeframeData = {
  initialItemCount: number;
  maxValue: number;
  prefix: string;
  getDatePeriod: (date: Date) => number;
  getPeriodKey: (date: Date) => string;
};

const TIMEFRAMES: {[key: string]: TimeframeData} = {
  day: {
    initialItemCount: 30,
    maxValue: 365,
    prefix: 'd',
    getDatePeriod: date => date.getUTCDay(),
    getPeriodKey: date => date.toLocaleDateString(),
  },
  week: {
    initialItemCount: 26,
    maxValue: 52,
    prefix: '',
    getDatePeriod: date => getWeekNumber(date),
    getPeriodKey: date => `${getWeekNumber(date)}/${date.getUTCFullYear()}`,
  },
  month: {
    initialItemCount: 15,
    maxValue: 12,
    prefix: 'm',
    getDatePeriod: date => date.getUTCMonth() + 1,
    getPeriodKey: date => `m${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`,
  },
};

const generatePeriodKeys = (firstDate: Date, lastDate: Date, timeframe: Timeframe, emptyValue: number | null = 0) => {
  const emptyValues: {[period: string]: any} = {};

  for (let year = firstDate.getUTCFullYear(); year <= lastDate.getUTCFullYear(); year++) {
    let maxPeriod = TIMEFRAMES[timeframe].maxValue;
    maxPeriod = year === lastDate.getUTCFullYear() ? TIMEFRAMES[timeframe].getDatePeriod(lastDate) : maxPeriod;

    for (let period = 1; period <= maxPeriod; period++) {
      //todo different method for timeframes
      emptyValues[`${TIMEFRAMES[timeframe].prefix}${period}/${year}`] = emptyValue;
    }
  }

  return emptyValues;
};

export {generatePeriodKeys, TIMEFRAMES};
export type {Timeframe};
