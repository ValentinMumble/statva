import {useContext} from 'react';
import {ActivityFilter, sortActivities} from '../models';
import {ActivityType, DetailedActivity} from '../models/strava';
import {ActivitiesContext} from '../providers';

const DEFAULT_TYPES = [ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide];

const useActivities = ({
  withCommute = true,
  withPrivate,
  search = '',
  sort = 'date',
  sortDirection = 'desc',
  includedActivityTypes = DEFAULT_TYPES,
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
      .filter(({type}) => 0 === includedActivityTypes.length || includedActivityTypes.includes(type))
      .sort((a, b) => sortActivities(sort, sortDirection, a, b)),
    isLoading,
  ];
};

export {useActivities};
