import {Activity} from './strava';
import {getDaysInMonth, getWeekNumber} from './util';

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
    getPeriodKey: date =>
      `${date.getUTCFullYear()}${TIMEFRAMES.week.separator}${getWeekNumber(date).toString().padStart(2, '0')}`,
  },
  month: {
    initialItemCount: 15,
    maxValue: 12,
    separator: '/',
    getDatePeriod: date => date.getUTCMonth() + 1,
    getPeriodKey: date =>
      `${date.getUTCFullYear()}${TIMEFRAMES.month.separator}${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`,
  },
};

const generatePeriodKeys = (firstDate: Date, lastDate: Date, timeframe: Timeframe, emptyValue: number | null = 0) => {
  //TODO try to remove any
  const emptyValues: {[period: string]: any} = {};
  const {maxValue, getDatePeriod, separator, getPeriodKey} = TIMEFRAMES[timeframe];

  for (let year = firstDate.getUTCFullYear(); year <= lastDate.getUTCFullYear(); year++) {
    let maxPeriod = maxValue;
    maxPeriod = year === lastDate.getUTCFullYear() ? getDatePeriod(lastDate) : maxPeriod;

    if ('day' === timeframe) {
      const maxMonth = TIMEFRAMES['month'].getDatePeriod(lastDate);
      for (let month = 1; month <= maxMonth; month++) {
        const maxDay = month === maxMonth ? maxPeriod : getDaysInMonth(month, year);
        for (let day = 1; day <= maxDay; day++) {
          emptyValues[getPeriodKey(new Date(`${year}-${month}-${day}`))] = emptyValue;
        }
      }
    } else {
      for (let period = 1; period <= maxPeriod; period++) {
        emptyValues[`${year}${separator}${period.toString().padStart(2, '0')}`] = emptyValue;
      }
    }
  }

  return emptyValues;
};

const buildPeriodMap = (activities: Activity[], timeframe: Timeframe, data: keyof Activity, itemCount: number) => {
  return Object.fromEntries(
    Object.entries(
      activities.reduce((periodMap: {[period: string]: number}, activity) => {
        const date = new Date(activity.start_date);
        const periodKey = TIMEFRAMES[timeframe].getPeriodKey(date);
        periodMap[periodKey] = (periodMap[periodKey] ?? 0) + (activity[data] as number);

        return periodMap;
      }, generatePeriodKeys(new Date(activities.at(0)?.start_date ?? 0), new Date(activities.at(-1)?.start_date ?? 0), timeframe))
    )
      .slice(-itemCount)
      .sort()
  );
};

//TODO not export generatePeriodKeys
export {generatePeriodKeys, buildPeriodMap, TIMEFRAMES};
export type {Timeframe};
