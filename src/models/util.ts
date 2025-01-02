const KJ_TO_CAL_RATIO = 1.114937039;

const formatDistance = (distance: number, precision = 0): string => `${(distance / 1000).toFixed(precision)} km`;
const formatElevation = (elevation: number): string => `${Math.round(elevation)} m`;
const formatSpeed = (speed: number, precision = 1): string => `${(speed * 3.6).toFixed(precision)} km/h`;
const formatPower = (power: number): string => `${Math.round(power)} W`;
const formatCalories = (kilojoules: number, withSymbol = true): string =>
  `${Math.round(kilojoules * KJ_TO_CAL_RATIO)}${withSymbol ? ' kcal' : ''}`;
const formatPercent = (ratio: number, precision = 0): string => `${(ratio * 100).toFixed(precision)}%`;

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

const removeNull = (object: object) => Object.fromEntries(Object.entries(object).filter(([_, v]) => v != null));

const backup = (array: {id: string}[]): string =>
  JSON.stringify(
    array.reduce((map: {[key: string]: {id: string}}, item) => {
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

  // encoded = encoded.replace(/\\\\/g, '\\');
  // //precision
  // var inv = 1.0 / 1e5;
  // var decoded = [];
  // var previous = [0, 0];
  // var i = 0;
  // //for each byte
  // while (i < encoded.length) {
  //   //for each coord (lat, lon)
  //   var ll = [0, 0];
  //   for (var j = 0; j < 2; j++) {
  //     var shift = 0;
  //     var byte = 0x20;
  //     //keep decoding bytes until you have this coord
  //     while (byte >= 0x20) {
  //       byte = encoded.charCodeAt(i++) - 63;
  //       ll[j] |= (byte & 0x1f) << shift;
  //       shift += 5;
  //     }
  //     //add previous offset to get final value and remember for next one
  //     ll[j] = previous[j] + (ll[j] & 1 ? ~(ll[j] >> 1) : ll[j] >> 1);
  //     previous[j] = ll[j];
  //   }
  //   //scale by precision and chop off long coords also flip the positions so
  //   //its the far more standard lon,lat instead of lat,lon
  //   decoded.push([ll[1] * inv, ll[0] * inv]);
  // }
  // //hand back the list of coordinates
  // return decoded;
};

export {
  arrayRotate,
  backup,
  decodePolyline,
  formatCalories,
  formatDistance,
  formatDuration,
  formatDurationInDays,
  formatElevation,
  formatSpeed,
  formatPercent,
  formatPower,
  getDaysInMonth,
  getMonthDiff,
  getWeekNumber,
  range,
  removeNull,
};
