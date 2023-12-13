import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {gearLabel, formatSpeed, getOptions} from '../../models';

const AverageGearChart = () => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
  });

  const dataPerGear = activities.reduce((gearMap: {[gearId: string]: number[]}, activity) => {
    const [cumulativeSpeed, rideCount] = gearMap[activity.gear_id] ?? [0, 0];
    gearMap[activity.gear_id] = [cumulativeSpeed + activity.average_speed, rideCount + 1];

    return gearMap;
  }, {});

  const averagePerGear = Object.keys(dataPerGear).reduce((gearMap: {[gearId: string]: number}, gearId) => {
    const [cumulativeSpeed, rideCount] = dataPerGear[gearId];
    gearMap[gearId] = cumulativeSpeed / rideCount;

    return gearMap;
  }, {});

  const sortedDesc = Object.fromEntries(Object.entries(averagePerGear).sort(([, a], [, b]) => b - a));

  const labels = Object.keys(sortedDesc).map(gearLabel);
  const series = [
    {
      name: '🏁',
      data: Object.values(sortedDesc),
    },
  ];

  return <Chart options={getOptions(labels, value => formatSpeed(value))} series={series} type="bar" height={400} />;
};

export {AverageGearChart};
