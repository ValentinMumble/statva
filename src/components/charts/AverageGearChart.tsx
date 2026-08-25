import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {useActivities, useLabels} from '../../hooks';
import {formatSpeed, getTypes, SUPER6} from '../../models';
import {ActivityType} from '../../models/strava';
import {ChartTooltip} from './ChartTooltip';

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

  const chart = useChart({
    data: Object.entries(averagePerGear)
      .sort(([, speedA], [, speedB]) => speedB - speedA)
      .map(([gearId, speed]) => ({gear: label(gearId, true), speed})),
    series: [{name: 'speed', color: 'orange.solid'}],
  });

  return (
    <Chart.Root width="100%" height="400px" chart={chart}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.data}>
          <XAxis dataKey="gear" stroke={chart.color('fg.muted')} tickLine={false} />
          <YAxis
            stroke={chart.color('fg.muted')}
            tickFormatter={value => formatSpeed(Number(value))}
            width={80}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{fill: chart.color('bg.muted')}}
            isAnimationActive={false}
            content={({payload, label: gear, active}) =>
              !active || !payload?.length ? null : (
                <ChartTooltip>
                  {gear} · 🏁 {formatSpeed(Number(payload[0].value))}
                </ChartTooltip>
              )
            }
          />
          {chart.series.map(item => (
            <Bar
              key={item.name}
              dataKey={chart.key(item.name)}
              fill={chart.color(item.color)}
              fillOpacity={0.55}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Chart.Root>
  );
};

export {AverageGearChart};
