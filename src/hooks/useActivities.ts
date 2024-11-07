import {useContext} from 'react';
import {ActivityFilter, sortActivities} from '../models';
import {DetailedActivity} from '../models/strava';
import {ActivitiesContext} from '../providers';
import {useFtp} from './useFtp';

const useActivities = ({
  withCommute = true,
  withPrivate,
  search = '',
  sort = 'date',
  sortDirection = 'desc',
  includedActivityTypes,
  gearId,
  years = [],
  minTime,
}: ActivityFilter): [
  DetailedActivity[] | null,
  (page: number, fetchNext?: boolean, items?: number) => Promise<void>
] => {
  const [activities, refetch] = useContext(ActivitiesContext);
  const [getFtp] = useFtp();

  return [
    null === activities
      ? null
      : activities
          .filter(({commute}) => commute === false || true === withCommute)
          .filter(activity => activity.private === false || true === withPrivate)
          .filter(({name}) => name.toLowerCase().includes(search.toLowerCase()))
          .filter(({gear_id}) => gearId === undefined || gear_id === gearId || (null === gear_id && 'null' === gearId))
          .filter(({start_date}) => 0 === years.length || years.includes(new Date(start_date).getUTCFullYear()))
          .filter(({sport_type}) => undefined === includedActivityTypes || includedActivityTypes.includes(sport_type))
          .filter(({moving_time}) => undefined === minTime || moving_time >= minTime)
          .sort((a, b) => sortActivities(sort, sortDirection, a, b, getFtp)),
    refetch,
  ];
};

export {useActivities};
