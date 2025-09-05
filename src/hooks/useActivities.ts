import {useContext} from 'react';
import {ActivityFilter, sortActivities} from '../models';
import {Activity} from '../models/strava';
import {ActivitiesContext} from '../providers';
import {useFtp} from './useFtp';
import {useActivityMeta} from './useActivityMeta';

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
  Activity[] | null,
  (page: number, fetchNext?: boolean, items?: number) => Promise<void>,
  Activity[],
  (id: number) => void
] => {
  const [activities, refetch, deleteActivity] = useContext(ActivitiesContext);
  const [getFtp] = useFtp();
  const [activityMeta] = useActivityMeta();

  const unprocessedActivities = activities?.filter(activity => !activity.name.match(/[\p{Emoji}]/gu)) ?? [];

  return [
    null === activities
      ? null
      : activities
          .filter(
            ({commute}) =>
              true === withCommute || ('only' === withCommute && commute) || (false === withCommute && !commute)
          )
          .filter(activity => activity.private === false || true === withPrivate)
          .filter(({name}) => name.normalize('NFD').toLowerCase().includes(search.normalize('NFD').toLowerCase()))
          .filter(({gear_id}) => gearId === undefined || gear_id === gearId || (null === gear_id && 'null' === gearId))
          .filter(({start_date}) => 0 === years.length || years.includes(new Date(start_date).getUTCFullYear()))
          .filter(({sport_type}) => undefined === includedActivityTypes || includedActivityTypes.includes(sport_type))
          .filter(({moving_time}) => undefined === minTime || moving_time >= minTime)
          .sort((a, b) =>
            sortActivities(sort, sortDirection, a, b, activityMeta[a.id] ?? null, activityMeta[b.id] ?? null, getFtp)
          ),
    refetch,
    unprocessedActivities,
    deleteActivity,
  ];
};

export {useActivities};
