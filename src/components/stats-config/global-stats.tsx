import {
  formatDistance,
  formatDuration,
  getMonday,
  getRidesBetween,
  getTotalValue,
} from '../../models';
import {Activity} from '../../models/strava';
import {StatEntry, StatTrend} from './types';

const getWeeksActivities = (activities: Activity[]) => {
  const monday = getMonday();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const lastMonday = new Date(monday);
  lastMonday.setDate(monday.getDate() - 7);
  const lastWeeksTomorrow = new Date(tomorrow);
  lastWeeksTomorrow.setDate(tomorrow.getDate() - 7);

  const weekActivities = getRidesBetween(activities, monday, tomorrow);
  const lastWeekActivities = getRidesBetween(activities, lastMonday, lastWeeksTomorrow);

  return [weekActivities, lastWeekActivities];
};

const GLOBAL_STATS: StatEntry[] = [
  activities => {
    const [weekActivities, lastWeekActivities] = getWeeksActivities(activities);
    const weekLoad = getTotalValue(weekActivities, 'suffer_score');
    const lastWeekLoad = getTotalValue(lastWeekActivities, 'suffer_score');
    const difference = Math.abs(weekLoad - lastWeekLoad);

    return {
      label: '🌶️',
      helpText: 'Training load',
      info: `Last week: ${lastWeekLoad}`,
      value: (
        <span>
          {weekLoad}
          <StatTrend marginLeft={5} up={weekLoad >= lastWeekLoad}>
            {difference}
          </StatTrend>
        </span>
      ),
    };
  },
  activities => {
    const [weekActivities, lastWeekActivities] = getWeeksActivities(activities);
    const weekMovingTime = getTotalValue(weekActivities, 'moving_time');
    const lastWeekMovingTime = getTotalValue(lastWeekActivities, 'moving_time');
    const difference = Math.abs(weekMovingTime - lastWeekMovingTime);

    return {
      label: '⏱️',
      helpText: 'Active time',
      info: `Last week: ${formatDuration(lastWeekMovingTime)}`,
      value: (
        <span>
          {formatDuration(weekMovingTime)}
          <StatTrend marginLeft={5} up={weekMovingTime >= lastWeekMovingTime}>
            {formatDuration(difference)}
          </StatTrend>
        </span>
      ),
    };
  },
  activities => {
    const [weekActivities, lastWeekActivities] = getWeeksActivities(activities);
    const weekDistance = getTotalValue(weekActivities, 'distance');
    const lastWeekDistance = getTotalValue(lastWeekActivities, 'distance');
    const difference = Math.abs(weekDistance - lastWeekDistance);

    return {
      label: '📍',
      helpText: 'Distance',
      info: `Last week: ${formatDistance(lastWeekDistance)}`,
      value: (
        <span>
          {formatDistance(weekDistance)}
          <StatTrend marginLeft={5} up={weekDistance >= lastWeekDistance}>
            {formatDistance(difference)}
          </StatTrend>
        </span>
      ),
    };
  },
];

export {GLOBAL_STATS};
