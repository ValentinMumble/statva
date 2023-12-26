const formatDistance = (distance: number, precision = 1): string => `${(distance / 1000).toFixed(precision)} km`;
const formatElevation = (elevation: number): string => `${Math.round(elevation)} m`;
const formatSpeed = (speed: number): string => `${(speed * 3.6).toFixed(1)} km/h`;

const formatDuration = (durationInSeconds: number): string => {
  const hours = durationInSeconds / 60 / 60;
  const roundHours = Math.floor(hours);
  const minutes = (hours - roundHours) * 60;
  const roundMinutes = Math.round(minutes);

  return `${roundHours}:${roundMinutes.toString().padStart(2, '0')} h`;
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

const extractEmoji = (text: string): string => {
  const emojiRegex = /\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]/g;
  const emojis = text.match(emojiRegex);

  return emojis?.join('') ?? '🤷';
};

const arrayRotate = <Type>(originalArray: Type[], count: number): Type[] => {
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
  getWeekNumber,
};
