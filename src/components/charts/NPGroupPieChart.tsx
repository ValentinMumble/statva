import {useActivities, useLabels} from '../../hooks';
import {countBy, extractNPGroup} from '../../models';
import {CountPieChart} from './CountPieChart';

const NPGroupPieChart = () => {
  const {activities} = useActivities({
    withCommute: false,
    withPrivate: true,
    search: 'N-Peloton',
    sort: 'date',
    sortDirection: 'asc',
  });
  const {label} = useLabels();

  const groupMap = countBy(activities ?? [], activity => extractNPGroup(activity.name));
  const data = Object.fromEntries(Object.entries(groupMap).sort(([a], [b]) => a.localeCompare(b)));
  const labels = Object.keys(data).map(key => label(key));

  return <CountPieChart data={data} labels={labels} entityName="Group" unitName="sessions by group" />;
};

export {NPGroupPieChart};
