const KJ_TO_CAL_RATIO = 1.114937039;

const formatDistance = (distance: number, precision = 0): string => `${(distance / 1000).toFixed(precision)} km`;
const formatDistanceMeters = (distance: number, precision = 0): string => `${distance.toFixed(precision)} m`;
const formatSpeed = (speed: number, precision = 1): string => `${(speed * 3.6).toFixed(precision)} km/h`;
const formatPower = (power: number): string => `${Math.round(power)} W`;
const formatCalories = (kilojoules: number, withSymbol = true): string =>
  `${Math.round(kilojoules * KJ_TO_CAL_RATIO)}${withSymbol ? ' kcal' : ''}`;
const formatPercent = (ratio: number, precision = 0): string => `${(ratio * 100).toFixed(precision)}%`;
const formatCurrency = (cents: number, precision = 2): string => `€${(cents / 100).toFixed(precision)}`;

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

const HEART_ZONE_BG_COLORS = ['transparent', '#abcf643a', '#e6d44c57', '#fab8334e', '#ff8e155b', '#ff4d114a'];
const POWER_ZONE_BG_COLORS = [...HEART_ZONE_BG_COLORS, '#ff0d0d50', '#ff0d0d50'];
const MONTH_BG_COLORS = [
  '#FF000015', // Red
  '#0000FF15', // Blue
  '#00800015', // Green
  '#FFFF0015', // Yellow
  '#80008015', // Purple
  '#FFA50015', // Orange
  '#FFC0CB15', // Pink
  '#A52A2A15', // Brown
  '#80808015', // Gray
  '#00FFFF15', // Cyan
  '#FF634715', // Tomato (Red-Orange)
  '#00FF7F15', // Spring Green
];

const getZoneColor = (zone: number): string => {
  switch (zone) {
    case 1:
      return 'blue';
    case 2:
      return 'green';
    case 3:
      return 'yellow';
    case 4:
      return 'orange';
    case 5:
      return 'red';
    case 6:
    case 7:
      return 'purple';
    default:
      return 'gray';
  }
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

const getMonday = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay(),
    diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday

  return new Date(d.setDate(diff));
};

const arrayRotate = <T>(originalArray: T[], count: number): T[] => {
  const array = [...originalArray];
  const length = array.length;
  array.push(...array.splice(0, ((-count % length) + length) % length));

  return array;
};

const range = (start: number = 0, stop: number = 0, step = 1): number[] =>
  Array(Math.ceil((stop - start) / step) + 1)
    .fill(start)
    .map((x, y) => x + y * step);

const removeNull = (object: object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value != null));

const backup = (array: {id: string}[]): string =>
  JSON.stringify(
    array.reduce((map: Record<string, {id: string}>, item) => {
      map[item.id] = item;

      return map;
    }, {})
  );

const getDaysInMonth = (month: number, year: number) =>
  month === 2 ? (year & 3 || (!(year % 25) && year & 15) ? 28 : 29) : 30 + ((month + (month >> 3)) & 1);

const getMonthDiff = (dateFrom: Date, dateTo: Date): number =>
  dateTo.getMonth() - dateFrom.getMonth() + 12 * (dateTo.getFullYear() - dateFrom.getFullYear());

const decodePolyline = (encoded: string): number[][] => {
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const precision = 1e5;
  const coordinates: number[][] = [];

  while (index < len) {
    let result = 1;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63 - 1;
      result += byte << shift;
      shift += 5;
    } while (byte >= 0x1f);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63 - 1;
      result += byte << shift;
      shift += 5;
    } while (byte >= 0x1f);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lat / precision, lng / precision]);
  }

  return coordinates;
};

const normalizeString = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const countBy = <T>(items: T[], keyFn: (item: T) => string, valueFn: (item: T) => number = () => 1): Record<string, number> =>
  items.reduce((map: Record<string, number>, item) => {
    const key = keyFn(item);
    map[key] = (map[key] ?? 0) + valueFn(item);

    return map;
  }, {});

export {
  arrayRotate,
  backup,
  countBy,
  normalizeString,
  decodePolyline,
  formatCalories,
  formatCurrency,
  formatDistance,
  formatDistanceMeters,
  formatDuration,
  formatDurationInDays,
  formatSpeed,
  formatPercent,
  formatPower,
  getDaysInMonth,
  getMonday,
  getMonthDiff,
  getWeekNumber,
  getZoneColor,
  HEART_ZONE_BG_COLORS,
  MONTH_BG_COLORS,
  POWER_ZONE_BG_COLORS,
  range,
  removeNull,
};
