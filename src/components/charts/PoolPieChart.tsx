import {useActivities, useLabels} from '../../hooks';
import {countBy} from '../../models';
import {ActivityType} from '../../models/strava';
import {CountPieChart} from './CountPieChart';

const PoolPieChart = () => {
  const {activities} = useActivities({
    withCommute: false,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: [ActivityType.Swim],
  });
  const {label} = useLabels();

  const data = countBy(activities ?? [], activity =>
    activity.name.match(/^Natation\s+(.+?)(?:\s+\p{Emoji}.*)?$/u)?.[1] ?? 'Unknown'
  );

  const labels = Object.keys(data).map(key => `${key} ${label(key)}`);

  return <CountPieChart data={data} labels={labels} entityName="Pool" unitName="sessions by pool" />;
};

export {PoolPieChart};
