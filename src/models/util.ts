const KJ_TO_CAL_RATIO = 1.114937039;

const formatDistance = (distance: number, precision = 0): string => `${(distance / 1000).toFixed(precision)} km`;
const formatElevation = (elevation: number): string => `${Math.round(elevation)} m`;
const formatSpeed = (speed: number, precision = 1): string => `${(speed * 3.6).toFixed(precision)} km/h`;
const formatPower = (power: number): string => `${Math.round(power)} W`;
const formatCalories = (kilojoules: number) => `${Math.round(kilojoules * KJ_TO_CAL_RATIO)} kcal`;

const formatDuration = (durationInSeconds: number, hoursOnly?: boolean): string => {
  const hours = durationInSeconds / 60 / 60;

  if (hoursOnly) {
    return `${Math.round(hours)} h`;
  }

  const wholeHours = Math.floor(hours);
  const minutes = Math.floor((hours - wholeHours) * 60);

  return `${wholeHours}h${minutes.toString().padStart(2, '0')}`;
};

const formatDurationInDays = (durationInSeconds: number): string => {
  const hourCount = durationInSeconds / 60 / 60 / 24;
  const hoursRemaining = (hourCount % 24) - Math.floor(hourCount);
  const suffix = 0.5 <= hoursRemaining ? '½' : '';

  return `${Math.floor(hourCount)}${suffix} days`;
};

const getWeekNumber = (date: Date): number => {
  date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

  // Calculate full weeks to nearest Thursday
  return Math.ceil(((date.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000) + 1) / 7);
};

const extractEmoji = (text: string): string =>
  text
    .match(/\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]/g)
    ?.join('') ?? '';

const arrayRotate = (originalArray: any[], count: number): typeof originalArray => {
  const array = [...originalArray];
  const length = array.length;
  array.push(...array.splice(0, ((-count % length) + length) % length));

  return array;
};

const range = (start: number = 0, stop: number = 0, step = 1): number[] =>
  Array(Math.ceil((stop - start) / step) + 1)
    .fill(start)
    .map((x, y) => x + y * step);

const generatePeriodKeys = (
  firstDate: Date,
  lastDate: Date,
  timeframe: 'month' | 'week',
  emptyValue: number | null = 0
) => {
  const emptyValues: {[period: string]: any} = {};

  for (let year = firstDate.getFullYear(); year <= lastDate.getFullYear(); year++) {
    let maxPeriod = 'month' === timeframe ? 12 : 52;
    maxPeriod =
      year === lastDate.getUTCFullYear()
        ? Math.min('month' === timeframe ? lastDate.getUTCMonth() + 1 : getWeekNumber(lastDate), maxPeriod)
        : maxPeriod;

    for (let period = 1; period <= maxPeriod; period++) {
      emptyValues[`${period}/${year}`] = emptyValue;
    }
  }

  return emptyValues;
};

const removeNull = (object: object): object => Object.fromEntries(Object.entries(object).filter(([_, v]) => v != null));

export {
  arrayRotate,
  extractEmoji,
  formatCalories,
  formatDistance,
  formatDuration,
  formatDurationInDays,
  formatElevation,
  formatSpeed,
  formatPower,
  generatePeriodKeys,
  getWeekNumber,
  KJ_TO_CAL_RATIO,
  range,
  removeNull,
};
