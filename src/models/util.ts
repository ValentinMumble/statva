const formatDistance = (distance: number, precision = 1): string => `${(distance / 1000).toFixed(precision)} km`;
const formatElevation = (elevation: number): string => `${elevation.toFixed(0)} m`;
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

export {formatDistance, formatDuration, formatDurationInDays, formatElevation, formatSpeed};
