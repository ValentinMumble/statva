import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {ChartProps, gearLabel, getOptions} from '../../models';

const GearChart = ({data, dataLabel, formatter, type, ...rest}: ChartProps) => {
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
  const series = 'pie' === type ? Object.values(sortedDesc) : [{name: dataLabel, data: Object.values(sortedDesc)}];

  return (
    <Chart
      options={getOptions(
        labels,
        formatter,
        'pie' === type
          ? {
              legend: {show: false},
              dataLabels: {
                enabled: true,
                formatter: (_, {seriesIndex}) => labels[seriesIndex],
                dropShadow: {enabled: false},
              },
            }
          : {}
      )}
      series={series}
      type={type ?? 'bar'}
      height={400}
      {...rest}
    />
  );
};

export {GearChart};
