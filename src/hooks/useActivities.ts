import {useEffect, useState} from 'react';
import {ActivityType, DetailedActivity, SortType} from '../models';
import {getActivities} from '../strava';

type ActivityFilter = {
  search?: string;
  sort?: SortType;
  sortDirection?: 'asc' | 'desc';
  excludedActivityTypes?: ActivityType[];
  withCommute: boolean;
  withPrivate: boolean;
};

const useActivities = ({
  withCommute,
  withPrivate,
  search = '',
  sort = 'date',
  sortDirection = 'asc',
  excludedActivityTypes = [ActivityType.AlpineSki],
}: ActivityFilter) => {
  const [activities, setActivities] = useState<DetailedActivity[] | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      const activities = await getActivities();

      setActivities(activities);
    };

    fetchActivities();
  }, []);

  if (null === activities) {
    return null;
  }

  return activities
    .filter(({commute}) => commute === false || true === withCommute)
    .filter(activity => activity.private === false || true === withPrivate)
    .filter(({name}) => name.toLowerCase().includes(search.toLowerCase()))
    .filter(({type}) => !excludedActivityTypes.includes(type))
    .sort((a, b) => {
      const [first, second] = 'asc' === sortDirection ? [a, b] : [b, a];

      switch (sort) {
        case 'name':
          return first.name < second.name ? 1 : -1;
        case 'elevation':
          return second.total_elevation_gain - first.total_elevation_gain;
        case 'distance':
          return second.distance - first.distance;
        case 'date':
          return first.start_date < second.start_date ? 1 : -1;
        case 'duration':
          return second.moving_time - first.moving_time;
        case 'average_speed':
          return second.average_speed - first.average_speed;
        case 'max_speed':
          return second.max_speed - first.max_speed;
      }
    });
};

export {useActivities};
