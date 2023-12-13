import {useContext} from 'react';
import {ActivityFilter, DEFAULT_INCLUDED_ACTIVITY_TYPES, sortActivities} from '../models';
import {DetailedActivity} from '../models/strava';
import {ActivitiesContext} from '../providers';

const useActivities = ({
  withCommute = true,
  withPrivate,
  search = '',
  sort = 'date',
  sortDirection = 'desc',
  includedActivityTypes = DEFAULT_INCLUDED_ACTIVITY_TYPES,
  gearId,
  years = [],
}: ActivityFilter): [DetailedActivity[], boolean] => {
  const [activities, isLoading] = useContext(ActivitiesContext);

  return [
    activities
      .filter(({commute}) => commute === false || true === withCommute)
      .filter(activity => activity.private === false || true === withPrivate)
      .filter(({name}) => name.toLowerCase().includes(search.toLowerCase()))
      .filter(({gear_id}) => gearId === undefined || gear_id === gearId || (null === gear_id && 'null' === gearId))
      .filter(({start_date}) => 0 === years.length || years.includes(new Date(start_date).getUTCFullYear()))
      .filter(({type}) => includedActivityTypes.includes(type))
      .sort((a, b) => sortActivities(sort, sortDirection, a, b)),
    isLoading,
  ];
};

export {useActivities};
