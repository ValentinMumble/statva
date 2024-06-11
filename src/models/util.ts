const KJ_TO_CAL_RATIO = 1.114937039;

const formatDistance = (distance: number, precision = 1): string => `${(distance / 1000).toFixed(precision)} km`;
const formatElevation = (elevation: number): string => `${Math.round(elevation)} m`;
const formatSpeed = (speed: number, precision = 1): string => `${(speed * 3.6).toFixed(precision)} km/h`;

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
  const suffix = 0.75 <= hoursRemaining ? '¾' : 0.5 <= hoursRemaining ? '½' : 0.25 <= hoursRemaining ? '¼' : '';

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

const WEEK_LABELS: {[week: string]: string} = {
  '8/2023': 'Tignes ⛷️',
  '35/2023': 'Italia 🇮🇹',
  '36/2023': 'Italia 🍝',
  '39/2023': "Provenc'Alpes ⛰️",
  '3/2024': "Mum's 🏡",
  '4/2024': "AFK'24 🍺",
  '5/2024': 'Grippe 🤒',
  '11/2024': 'Monêtier 🎿',
  '15/2024': 'Alpes M ⛰️',
  '16/2024': 'Annecy 🚤',
  '17/2024': 'Ventoux 🏔️',
  '18/2024': 'Toulon 😎',
  '23/2024': 'Briançon ⛰️',
};

const getWeekLabel = (week: string): string => {
  const today = new Date();

  if (week === `${getWeekNumber(today)}/${today.getUTCFullYear()}`) {
    return 'This week';
  }

  return WEEK_LABELS[week] ?? week;
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

const generatePeriodKeys = (firstDate: Date, lastDate: Date, timeframe: 'month' | 'week') => {
  const emptyValues: {[period: string]: any} = {};

  for (let year = firstDate.getFullYear(); year <= lastDate.getFullYear(); year++) {
    let maxPeriod = 'month' === timeframe ? 12 : 52;
    maxPeriod =
      year === lastDate.getUTCFullYear()
        ? Math.min('month' === timeframe ? lastDate.getUTCMonth() + 1 : getWeekNumber(lastDate), maxPeriod)
        : maxPeriod;

    for (let period = 1; period <= maxPeriod; period++) {
      emptyValues[`${period}/${year}`] = null;
    }
  }

  return emptyValues;
};

export {
  arrayRotate,
  extractEmoji,
  formatDistance,
  formatDuration,
  formatDurationInDays,
  formatElevation,
  formatSpeed,
  generatePeriodKeys,
  getWeekLabel,
  getWeekNumber,
  KJ_TO_CAL_RATIO,
  range,
};
