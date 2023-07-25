import {useEffect, useState} from 'react';
import {DetailedActivity, SortType} from '../models';
import {getActivities} from '../strava';

type ActivityFilter = {
  search: string;
  showCommute: boolean;
  showPrivate: boolean;
  sort: SortType;
};

const useActivities = ({showCommute, showPrivate, search, sort}: ActivityFilter) => {
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
    .filter(({commute}) => commute === false || true === showCommute)
    .filter(activity => activity.private === false || true === showPrivate)
    .filter(({name}) => name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name < b.name ? 1 : -1;
        case 'elevation':
          return b.total_elevation_gain - a.total_elevation_gain;
        case 'distance':
          return b.distance - a.distance;
        case 'date':
          return a.start_date < b.start_date ? 1 : -1;
        case 'duration':
          return b.moving_time - a.moving_time;
        case 'average_speed':
          return b.average_speed - a.average_speed;
      }
    });
};

export {useActivities};
