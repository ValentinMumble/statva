import {useEffect, useState} from 'react';
import {ActivityFilter, DEFAULT_INCLUDED_ACTIVITY_TYPES, DetailedActivity, sortActivities} from '../models';
import {getActivities} from '../strava';

const useActivities = ({
  withCommute,
  withPrivate,
  search = '',
  sort = 'date',
  sortDirection = 'desc',
  includedActivityTypes = DEFAULT_INCLUDED_ACTIVITY_TYPES,
  gearId,
  year,
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
    .filter(({gear_id}) => gearId === undefined || gear_id === gearId || (null === gear_id && 'null' === gearId))
    .filter(({start_date}) => undefined === year || new Date(start_date).getUTCFullYear() === year)
    .filter(({type}) => includedActivityTypes.includes(type))
    .sort((a, b) => sortActivities(sort, sortDirection, a, b));
};

export {useActivities};
