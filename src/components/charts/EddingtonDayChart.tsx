import {useMemo, useState} from 'react';
import {Group} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Slider} from '../../components/ui';
import {useActivities} from '../../hooks';
import {getTypes, daysExceedingDistance, eddingtonNumber, range} from '../../models';
import {ActivityType} from '../../models/strava';
import {ChartTooltip} from './ChartTooltip';

const BOUNDARIES = [0, 250];
const INITIAL_RANGE = [10, 120];

const EddingtonDayChart = () => {
  const [distanceRange, setDistanceRange] = useState<number[]>(INITIAL_RANGE);
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(ActivityType.Ride),
  });

  const [eddington] = useMemo(() => eddingtonNumber(activities ?? []), [activities]);
  const ridesByDistance = useMemo(() => daysExceedingDistance(activities ?? []), [activities]);

  const chart = useChart({
    data: Object.entries(ridesByDistance)
      .filter(([distance]) => Number(distance) >= distanceRange[0] && Number(distance) <= distanceRange[1])
      .map(([distance, dayCount]) => ({
        distance: Number(distance),
        dayCount,
        isEddington: eddington === Number(distance),
      })),
    series: [{name: 'dayCount', color: 'orange.solid'}],
  });

  return (
    <>
      <Group width="full" justifyContent="center">
        <Slider
          width="90%"
          size="sm"
          value={distanceRange}
          onValueChange={({value}) => setDistanceRange(value)}
          min={BOUNDARIES[0]}
          max={BOUNDARIES[1]}
          marks={range(BOUNDARIES[0], BOUNDARIES[1], Math.round(BOUNDARIES[1] / 5)).map(value => ({
            label: value,
            value,
          }))}
        />
      </Group>
      <Chart.Root width="100%" height="400px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} margin={{top: 30}}>
            <XAxis dataKey="distance" stroke={chart.color('fg.muted')} tickLine={false} interval="preserveStartEnd" />
            <YAxis stroke={chart.color('fg.muted')} width={40} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{fill: chart.color('bg.muted')}}
              isAnimationActive={false}
              content={({payload, label: distance, active}) =>
                !active || !payload?.length ? null : (
                  <ChartTooltip>
                    {distance} km · {payload[0].value} days
                  </ChartTooltip>
                )
              }
            />
            {chart.series.map(item => (
              <Bar
                key={item.name}
                dataKey={chart.key(item.name)}
                fill={chart.color(item.color)}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              >
                {chart.data.map(row => (
                  <Cell key={row.distance} fillOpacity={row.isEddington ? 1 : 0.45} />
                ))}
                <LabelList
                  dataKey="distance"
                  position="top"
                  fontSize={12}
                  fill={chart.color('orange.solid')}
                  formatter={(value: unknown) => (eddington === Number(value) ? String(eddington) : '')}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {EddingtonDayChart};
