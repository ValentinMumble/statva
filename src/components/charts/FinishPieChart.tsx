import {useActivityMeta, useLabels} from '../../hooks';
import {ClubRules, computeFinishCount} from '../../models';
import {CountPieChart} from './CountPieChart';

const FinishPieChart = ({club}: {club: ClubRules}) => {
  const {activityMeta} = useActivityMeta();
  const {label} = useLabels();

  const data = computeFinishCount(Object.values(activityMeta), club);
  const labels = Object.keys(data).map(key => label(key));

  return <CountPieChart data={data} labels={labels} entityName="Bar" unitName="finish" />;
};

export {FinishPieChart};
