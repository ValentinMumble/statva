import Chart from 'react-apexcharts';
import {useActivities, useLabels} from '../../hooks';
import {ChartProps, getOptions, getTypes} from '../../models';
import {ActivityType} from '../../models/strava';

const GearChart = ({data, formatter, type, ...rest}: ChartProps) => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    includedActivityTypes: getTypes(ActivityType.Ride),
  });
  const [label] = useLabels();

  const dataPerGear = (activities ?? []).reduce((gearMap: {[gearId: string]: number}, activity) => {
    if (null === activity.gear_id) return gearMap;

    gearMap[activity.gear_id] = (gearMap[activity.gear_id] ?? 0) + (activity[data] as number);

    return gearMap;
  }, {});

  const sortedDesc = Object.fromEntries(Object.entries(dataPerGear).sort(([, a], [, b]) => b - a));
  const labels = Object.keys(sortedDesc).map(gearId => label(gearId, true));
  const series = 'pie' === type ? Object.values(sortedDesc) : [{name: label(data), data: Object.values(sortedDesc)}];

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
              stroke: {width: 0},
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
