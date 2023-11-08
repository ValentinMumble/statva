import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {GEARS, formatSpeed, getOptions} from '../models';

const AverageGearChart = () => {
  const activities = useActivities({
    withCommute: true,
    withPrivate: true,
  });

  if (null === activities) {
    return null;
  }

  const dataPerGear = activities.reduce((gearMap: {[gearId: string]: number[]}, activity) => {
    const [cumulativeSpeed, rideCount] = gearMap[activity.gear_id] ?? [0, 0];
    gearMap[activity.gear_id] = [cumulativeSpeed + activity.average_speed, rideCount + 1];

    return gearMap;
  }, {});

  const labels = Object.keys(dataPerGear).map(gearId => GEARS[gearId]?.label ?? '🤷');
  const series = [
    {
      name: 'Average speed',
      data: Object.values(dataPerGear).map(([cumulativeSpeed, rideCount]) => cumulativeSpeed / rideCount),
    },
  ];

  return (
    <Chart
      options={getOptions('Average speed / gear 💯', labels, value => formatSpeed(value))}
      series={series}
      type="bar"
      height={400}
    />
  );
};

export {AverageGearChart};
