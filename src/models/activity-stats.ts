import {Activity} from './strava';

const getTotalValue = (activities: Activity[], value: keyof Activity): number =>
  activities.reduce((total, activity) => {
    if (typeof activity[value] !== 'number') {
      return total;
    }

    return activity[value] + total;
  }, 0);

const getMaxValue = (activities: Activity[], value: keyof Activity): number =>
  Math.max(...activities.map(activity => Number(activity[value] ?? 0)));

const getAverageValue = (activities: Activity[], value: keyof Activity): number =>
  activities
    .filter(activity => undefined !== activity[value])
    .reduce((total, activity, _index, activities) => total + Number(activity[value]) / activities.length, 0);

const getRidesBeforeMonth = (rides: Activity[], date: Date) =>
  rides.filter(ride => new Date(ride.start_date) < new Date(date.getFullYear(), date.getMonth() + 1, 0));

const getRidesBetween = (rides: Activity[], from: Date, to?: Date | undefined): Activity[] =>
  rides.filter(
    ride =>
      new Date(ride.start_date) >= new Date(from.toDateString()) &&
      new Date(ride.start_date) < new Date(to?.toDateString() ?? new Date())
  );

// Only the date and the distance matter, so a cached detailed record fits too.
type DatedDistance = {start_date: string; distance: number};

const eddingtonNumber = (rides: DatedDistance[]) => {
  const dailyDistances = rides.reduce((dayMap: Record<string, number>, activity) => {
    const dateString = new Date(activity.start_date).toISOString().slice(0, 10);
    dayMap[dateString] = (dayMap[dateString] ?? 0) + activity.distance;

    return dayMap;
  }, {});

  const distancesKm = Object.values(dailyDistances)
    .map(distance => distance / 1000)
    .sort((a, b) => b - a);

  let eddingtonNumber = 0;

  for (let i = 0; i < distancesKm.length; i++) {
    if (distancesKm[i] >= i + 1) {
      eddingtonNumber = i + 1;
    } else {
      break;
    }
  }

  const daysForNextLevel = Math.max(
    0,
    eddingtonNumber + 1 - distancesKm.filter(distance => distance >= eddingtonNumber + 1).length
  );

  return [eddingtonNumber, daysForNextLevel];
};

const daysExceedingDistance = (rides: DatedDistance[]): Record<number, number> => {
  const dailyDistances = rides.reduce((dayMap: Record<string, number>, activity) => {
    const dateString = new Date(activity.start_date).toISOString().slice(0, 10);
    dayMap[dateString] = (dayMap[dateString] ?? 0) + activity.distance;

    return dayMap;
  }, {});

  const distancesKm = Object.values(dailyDistances).map(distance => distance / 1000);

  const result: {[distanceKm: number]: number} = {};
  for (let distance = 1; distance <= Math.max(...distancesKm); distance++) {
    result[distance] = 0;
  }

  distancesKm.forEach(distance => {
    for (let d = 1; d <= Math.floor(distance); d++) {
      result[d]++;
    }
  });

  return result;
};

export {
  daysExceedingDistance,
  eddingtonNumber,
  getAverageValue,
  getMaxValue,
  getRidesBeforeMonth,
  getRidesBetween,
  getTotalValue,
};
