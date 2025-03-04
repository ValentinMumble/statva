import {Activity} from './strava';
import {getDaysInMonth, getWeekNumber} from './util';

type Timeframe = 'day' | 'week' | 'month' | 'year';

type TimeframeData = {
  initialItemCount: number;
  maxValue: number;
  separator: string;
  getDatePeriod: (date: Date) => number;
  getPeriodKey: (date: Date) => string;
};

const TIMEFRAMES: Record<Timeframe, TimeframeData> = {
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
    getPeriodKey: date => {
      let year = date.getUTCFullYear();
      if (date.getUTCMonth() === 11 && getWeekNumber(date) === 1) {
        year++;
      }

      return `${year}${TIMEFRAMES.week.separator}${getWeekNumber(date).toString().padStart(2, '0')}`;
    },
  },
  month: {
    initialItemCount: 15,
    maxValue: 12,
    separator: '/',
    getDatePeriod: date => date.getUTCMonth() + 1,
    getPeriodKey: date =>
      `${date.getUTCFullYear()}${TIMEFRAMES.month.separator}${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`,
  },
  year: {
    initialItemCount: 5,
    maxValue: 5,
    separator: '',
    getDatePeriod: date => date.getUTCFullYear(),
    getPeriodKey: date => date.getUTCFullYear().toString(),
  },
}; ;

const generatePeriodKeys = (firstDate: Date, lastDate: Date, timeframe: Timeframe, emptyValue: number | null = 0) => {
  const emptyValues: {[period: string]: any} = {};
  const {maxValue, getDatePeriod, separator, getPeriodKey} = TIMEFRAMES[timeframe];

  for (let year = firstDate.getUTCFullYear(); year <= lastDate.getUTCFullYear(); year++) {
    let maxPeriod = maxValue;
    maxPeriod = year === lastDate.getUTCFullYear() ? getDatePeriod(lastDate) : maxPeriod;

    if ('day' === timeframe) {
      const maxMonth = TIMEFRAMES['month'].getDatePeriod(lastDate);
      for (let month = 1; month <= maxMonth; month++) {
        const maxDay = month === maxMonth ? lastDate.getDate() : getDaysInMonth(month, year);
        for (let day = 1; day <= maxDay; day++) {
          emptyValues[
            getPeriodKey(new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`))
          ] = emptyValue;
        }
      }
    } else if ('year' === timeframe) {
      emptyValues[year.toString()] = emptyValue;
    } else {
      for (let period = 1; period <= maxPeriod; period++) {
        emptyValues[`${year}${separator}${period.toString().padStart(2, '0')}`] = emptyValue;
      }
    }
  }

  return emptyValues;
};

const aggregateTimeframeData = (
  activities: Activity[],
  timeframe: Timeframe,
  data: keyof Activity | number,
  itemCount: number
) =>
  Object.fromEntries(
    Object.entries(
      activities.reduce((periodMap: {[period: string]: number}, activity) => {
        const date = new Date(activity.start_date);
        const periodKey = TIMEFRAMES[timeframe].getPeriodKey(date);
        const valueToAdd = 'number' === typeof data ? data : Number(activity[data] ?? 0);
        periodMap[periodKey] = (periodMap[periodKey] ?? 0) + valueToAdd;

        return periodMap;
      }, generatePeriodKeys(new Date(activities.at(0)?.start_date ?? 0), new Date(activities.at(-1)?.start_date ?? 0), timeframe))
    )
      .sort()
      .slice(-itemCount)
  );

//TODO unit test
const aggregateActivityTypeCount = (activities: Activity[], timeframe: Timeframe, itemCount: number) =>
  Object.fromEntries(
    Object.entries(
      activities.reduce((periodMap: {[period: string]: {[type: string]: number} | null}, activity) => {
        const date = new Date(activity.start_date);
        const periodKey = TIMEFRAMES[timeframe].getPeriodKey(date);
        const data = periodMap[periodKey] ?? {};
        const key = activity.commute ? 'Commute' : activity.sport_type;
        periodMap[periodKey] = {...data, [key]: (data[key] ?? 0) + 1};

        return periodMap;
      }, generatePeriodKeys(new Date(activities.at(0)?.start_date ?? 0), new Date(activities.at(-1)?.start_date ?? 0), timeframe))
    )
      .sort()
      .slice(-itemCount)
  );

export {generatePeriodKeys, aggregateTimeframeData, aggregateActivityTypeCount, TIMEFRAMES};
export type {Timeframe};
