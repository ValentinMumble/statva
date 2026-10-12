import {useActivities, useActivityMeta, useLabels} from '../../hooks';
import {ClubRules, countBy, DEFAULT_CLUB, extractNPGroup} from '../../models';
import {CountPieChart} from './CountPieChart';

const NPGroupPieChart = ({club = DEFAULT_CLUB}: {club?: ClubRules}) => {
  const {activities} = useActivities({
    withCommute: false,
    withPrivate: true,
    search: club.name,
    sort: 'date',
    sortDirection: 'asc',
  });
  const {label} = useLabels();
  const {activityMeta} = useActivityMeta();

  const groupMap = countBy(activities ?? [], activity =>
    extractNPGroup(activity.name, activityMeta[activity.id] ?? null, club)
  );
  const data = Object.fromEntries(Object.entries(groupMap).sort(([a], [b]) => a.localeCompare(b)));
  const labels = Object.keys(data).map(key => label(key));

  return <CountPieChart data={data} labels={labels} entityName="Group" unitName="sessions by group" />;
};

export {NPGroupPieChart};
