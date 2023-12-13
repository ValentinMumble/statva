import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {ChartProps, gearLabel, getOptions} from '../../models';

const GearChart = ({data, formatter}: ChartProps) => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
  });

  const dataPerGear = activities.reduce((gearMap: {[gearId: string]: number}, activity) => {
    gearMap[activity.gear_id] = (gearMap[activity.gear_id] ?? 0) + (activity[data] as number);

    return gearMap;
  }, {});

  const sortedDesc = Object.fromEntries(Object.entries(dataPerGear).sort(([, a], [, b]) => b - a));
  const labels = Object.keys(sortedDesc).map(gearLabel);
  const series = [{name: data, data: Object.values(sortedDesc)}];

  return <Chart options={getOptions(labels, formatter)} series={series} type="bar" height={400} />;
};

export {GearChart};
