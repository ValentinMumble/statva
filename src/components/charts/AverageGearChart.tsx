import Chart from 'react-apexcharts';
import {useActivities, useAthlete} from '../../hooks';
import {formatSpeed, getOptions, getGearEmoji} from '../../models';
import {ActivityType} from '../../models/strava';

const AverageGearChart = () => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    includedActivityTypes: [ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide],
  });
  const athlete = useAthlete();

  const dataPerGear = activities.reduce((gearMap: {[gearId: string]: number[]}, activity) => {
    const [cumulativeDistance, movingTime] = gearMap[activity.gear_id] ?? [0, 0];
    gearMap[activity.gear_id] = [cumulativeDistance + activity.distance, movingTime + activity.moving_time];

    return gearMap;
  }, {});

  const averagePerGear = Object.keys(dataPerGear).reduce((gearMap: {[gearId: string]: number}, gearId) => {
    const [cumulativeDistance, movingTime] = dataPerGear[gearId];
    gearMap[gearId] = cumulativeDistance / movingTime;

    return gearMap;
  }, {});

  const sortedDesc = Object.fromEntries(Object.entries(averagePerGear).sort(([, a], [, b]) => b - a));

  const labels = Object.keys(sortedDesc).map(gearId => getGearEmoji(athlete, ActivityType.Ride, gearId));
  const series = [
    {
      name: '🏁',
      data: Object.values(sortedDesc),
    },
  ];

  return <Chart options={getOptions(labels, value => formatSpeed(value))} series={series} type="bar" height={400} />;
};

export {AverageGearChart};
