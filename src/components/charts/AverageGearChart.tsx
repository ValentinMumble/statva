import Chart from 'react-apexcharts';
import {useActivities, useLabels} from '../../hooks';
import {formatSpeed, getOptions, getTypes, SUPER6} from '../../models';
import {ActivityType} from '../../models/strava';

const AverageGearChart = () => {
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    includedActivityTypes: getTypes(ActivityType.Ride),
  });
  const {label} = useLabels();

  const filteredRides = (activities ?? []).filter(ride => !ride.commute || (ride.commute && SUPER6 !== ride.gear_id));

  const dataPerGear = filteredRides.reduce((gearMap: Record<string, number[]>, activity) => {
    if (null === activity.gear_id) return gearMap;

    const [cumulativeDistance, movingTime] = gearMap[activity.gear_id] ?? [0, 0];
    gearMap[activity.gear_id] = [cumulativeDistance + activity.distance, movingTime + activity.moving_time];

    return gearMap;
  }, {});

  const averagePerGear = Object.keys(dataPerGear).reduce((gearMap: Record<string, number>, gearId) => {
    const [cumulativeDistance, movingTime] = dataPerGear[gearId];
    gearMap[gearId] = cumulativeDistance / movingTime;

    return gearMap;
  }, {});

  const sortedDesc = Object.fromEntries(Object.entries(averagePerGear).sort(([, a], [, b]) => b - a));

  const labels = Object.keys(sortedDesc).map(gearId => label(gearId, true));
  const series = [
    {
      name: '🏁',
      data: Object.values(sortedDesc),
    },
  ];

  return <Chart options={getOptions(labels, value => formatSpeed(value))} series={series} type="bar" height={400} />;
};

export {AverageGearChart};
