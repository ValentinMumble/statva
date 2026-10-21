import {useActivities} from '../../hooks';
import {countBy} from '../../models';
import {ActivityType} from '../../models/strava';
import {CountPieChart} from './CountPieChart';

const CourtPieChart = () => {
  const {activities} = useActivities({
    withCommute: false,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: [ActivityType.Tennis],
  });

  const data = countBy(
    activities ?? [],
    activity =>
      activity.name
        .replace(/^Tennis\s+/, '')
        .split(/\s+\p{Emoji}|[-–]/u)[0]
        .trim() || 'Unknown',
  );

  const labels = Object.keys(data);

  return <CountPieChart data={data} labels={labels} entityName="Court" unitName="sessions by court" />;
};

export {CourtPieChart};
