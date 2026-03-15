import {useActivities, useLabels} from '../../hooks';
import {ActivityType} from '../../models/strava';
import {CountPieChart} from './CountPieChart';

const PoolPieChart = () => {
  const [activities] = useActivities({
    withCommute: false,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: [ActivityType.Swim],
  });
  const [label] = useLabels();

  const data = (activities ?? []).reduce((map: Record<string, number>, activity) => {
    const poolName = activity.name.match(/^Natation\s+(.+?)(?:\s+\p{Emoji}.*)?$/u)?.[1] ?? 'Unknown';
    map[poolName] = (map[poolName] ?? 0) + 1;

    return map;
  }, {});

  const labels = Object.keys(data).map(key => `${key} ${label(key)}`);

  return <CountPieChart data={data} labels={labels} entityName="Pool" unitName="sessions by pool" />;
};

export {PoolPieChart};
