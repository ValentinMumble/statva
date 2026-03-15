import {useActivityMeta, useLabels} from '../../hooks';
import {computeFinishCount} from '../../models';
import {CountPieChart} from './CountPieChart';

const FinishPieChart = () => {
  const [activityMeta] = useActivityMeta();
  const [label] = useLabels();

  const data = computeFinishCount(Object.values(activityMeta));
  const labels = Object.keys(data).map(key => label(key));

  return <CountPieChart data={data} labels={labels} entityName="Bar" unitName="finish" />;
};

export {FinishPieChart};
