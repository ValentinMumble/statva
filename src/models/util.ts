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

/** Google's encoded polyline format (precision 1e5), the one Strava uses for tracks. */
const encodePolyline = (points: number[][]): string => {
  let previousLat = 0;
  let previousLng = 0;
  let encoded = '';

  const encodeValue = (value: number) => {
    let shifted = value < 0 ? ~(value << 1) : value << 1;

    while (shifted >= 0x20) {
      encoded += String.fromCharCode((0x20 | (shifted & 0x1f)) + 63);
      shifted >>= 5;
    }
    encoded += String.fromCharCode(shifted + 63);
  };

  for (const [lat, lng] of points) {
    const roundedLat = Math.round(lat * 1e5);
    const roundedLng = Math.round(lng * 1e5);
    encodeValue(roundedLat - previousLat);
    encodeValue(roundedLng - previousLng);
    previousLat = roundedLat;
    previousLng = roundedLng;
  }

  return encoded;
};

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

const MONTHS_LONG = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Builds a searchable string of the many ways one might type an activity's date,
// so a free-text search can match "november 2", "2 nov", "2024-11-02" or the
// "02/11/2024" shown in the list. Uses local date parts to match the displayed date.
const dateSearchHaystack = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const long = MONTHS_LONG[month];
  const short = MONTHS_SHORT[month];
  const dd = String(day).padStart(2, '0');
  const mm = String(month + 1).padStart(2, '0');

  return [
    `${year}-${mm}-${dd}`, // 2024-11-02
    `${dd}/${mm}/${year}`, // 02/11/2024 (fr-FR, as shown in the list)
    `${long} ${day}`, // november 2
    `${day} ${long}`, // 2 november
    `${short} ${day}`, // nov 2
    `${day} ${short}`, // 2 nov
    `${long} ${year}`, // november 2024
    `${short} ${year}`, // nov 2024
    `${long} ${day} ${year}`, // november 2 2024
    `${day} ${long} ${year}`, // 2 november 2024
  ].join(' | ');
};

const countBy = <T>(items: T[], keyFn: (item: T) => string, valueFn: (item: T) => number = () => 1): Record<string, number> =>
  items.reduce((map: Record<string, number>, item) => {
    const key = keyFn(item);
    map[key] = (map[key] ?? 0) + valueFn(item);

    return map;
  }, {});

export {
  backup,
  countBy,
  dateSearchHaystack,
  normalizeString,
  decodePolyline,
  encodePolyline,
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
  range,
  removeNull,
};
