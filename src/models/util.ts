const formatDistance = (distance: number, precision = 1): string => `${(distance / 1000).toFixed(precision)} km`;
const formatElevation = (elevation: number): string => `${Math.round(elevation)} m`;
const formatSpeed = (speed: number, precision = 1): string => `${(speed * 3.6).toFixed(precision)} km/h`;

const formatDuration = (durationInSeconds: number): string => {
  const hours = durationInSeconds / 60 / 60;
  const roundHours = Math.floor(hours);
  const minutes = Math.round((hours - roundHours) * 60);

  return `${roundHours}:${minutes.toString().padStart(2, '0')} h`;
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
  '4/2024': "AFK'24 🍺",
  '5/2024': 'Grippe 🤒',
};

const getWeekLabel = (week: string): string => {
  const today = new Date(),
    lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  if (week === `${getWeekNumber(today)}/${today.getUTCFullYear()}`) {
    return 'This week';
  }

  if (week === `${getWeekNumber(lastWeek)}/${lastWeek.getUTCFullYear()}`) {
    return 'Last week';
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

export {
  arrayRotate,
  extractEmoji,
  formatDistance,
  formatDuration,
  formatDurationInDays,
  formatElevation,
  formatSpeed,
  getWeekLabel,
  getWeekNumber,
};
