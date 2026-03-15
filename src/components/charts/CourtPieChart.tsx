import {useActivities} from '../../hooks';
import {ActivityType} from '../../models/strava';
import {CountPieChart} from './CountPieChart';

const CourtPieChart = () => {
  const [activities] = useActivities({
    withCommute: false,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: [ActivityType.Tennis],
  });

  const data = (activities ?? []).reduce((map: Record<string, number>, activity) => {
    const courtName =
      activity.name.replace(/^Tennis\s+/, '').split(/\s+\p{Emoji}|[-–]/u)[0].trim() || 'Unknown';
    map[courtName] = (map[courtName] ?? 0) + 1;

    return map;
  }, {});

  const labels = Object.keys(data);

  return <CountPieChart data={data} labels={labels} entityName="Court" unitName="sessions by court" />;
};

export {CourtPieChart};
