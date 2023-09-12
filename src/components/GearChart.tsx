import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {ChartProps, GEARS, getOptions} from '../models';

const GearChart = ({title, data, formatter}: ChartProps) => {
  const activities = useActivities({
    withCommute: true,
    withPrivate: true,
  });

  if (null === activities) {
    return null;
  }

  const dataPerGear = activities.reduce((gearMap: {[gearId: string]: number}, activity) => {
    gearMap[activity.gear_id] = (gearMap[activity.gear_id] ?? 0) + (activity[data] as number);

    return gearMap;
  }, {});

  const labels = Object.keys(dataPerGear).map(gearId => GEARS[gearId]?.label ?? '🤷');
  const series = [{name: data, data: Object.values(dataPerGear)}];

  return <Chart options={getOptions(title, labels, formatter)} series={series} type="bar" height={400} />;
};

export {GearChart};
