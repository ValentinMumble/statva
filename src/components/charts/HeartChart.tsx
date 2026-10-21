import {useState} from 'react';
import {Group} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {StepperInput} from '../../components/ui';
import {useActivities, useSettings} from '../../hooks';
import {ActivityType} from '../../models/strava';
import {formatPower, getTypes} from '../../models';
import {ChartTooltip} from './ChartTooltip';

const MIN_DISTANCE_METERS = 30 * 1000;
const DEFAULT_ITEM_COUNT = 50;

// search narrows it to the rides whose name has it, like a club's.
const HeartChart = ({search}: {search?: string}) => {
  const {locale} = useSettings();
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(ActivityType.Ride),
    search,
  });

  const rides = (activities ?? []).filter(
    ({average_heartrate, weighted_average_watts, distance}) =>
      (0 < (average_heartrate ?? 0) || 0 < (weighted_average_watts ?? 0)) && MIN_DISTANCE_METERS < distance,
  );

  const chart = useChart({
    data: rides.slice(-itemCount).map(({average_heartrate, weighted_average_watts, start_date}) => ({
      timestamp: new Date(start_date).getTime(),
      heartRate: average_heartrate ? Math.round(average_heartrate) : null,
      power: weighted_average_watts ? Math.round(weighted_average_watts) : null,
    })),
    series: [
      {name: 'heartRate', color: 'green.solid'},
      {name: 'power', color: 'orange.solid'},
    ],
  });

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <StepperInput
          size="xs"
          value={itemCount.toString()}
          onValueChange={({valueAsNumber}) => setItemCount(valueAsNumber)}
        />
      </Group>
      <Chart.Root width="100%" height="400px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.data}>
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke={chart.color('fg.muted')}
              tickLine={false}
              tickFormatter={timestamp =>
                new Date(timestamp).toLocaleDateString(locale, {month: 'short', year: '2-digit'})
              }
            />
            <YAxis
              yAxisId="heartRate"
              domain={[60, 190]}
              stroke={chart.color('fg.muted')}
              width={50}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="power"
              orientation="right"
              domain={[80, 320]}
              stroke={chart.color('fg.muted')}
              width={60}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => formatPower(Number(value))}
            />
            <Tooltip
              cursor={{stroke: chart.color('fg.muted'), strokeWidth: 1}}
              isAnimationActive={false}
              content={({payload, active}) => {
                if (!active || !payload?.length) return null;

                const {timestamp, heartRate, power} = payload[0].payload as {
                  timestamp: number;
                  heartRate: number | null;
                  power: number | null;
                };

                return (
                  <ChartTooltip>
                    <div>{new Date(timestamp).toLocaleDateString(locale)}</div>
                    {null !== heartRate && <div>🫀 {heartRate}</div>}
                    {null !== power && <div>⚡️ {formatPower(power)}</div>}
                  </ChartTooltip>
                );
              }}
            />
            <Line
              yAxisId="heartRate"
              dataKey={chart.key('heartRate')}
              type="monotone"
              stroke={chart.color('green.solid')}
              strokeWidth={3}
              dot={false}
              activeDot={{r: 4}}
              connectNulls={true}
              isAnimationActive={false}
            />
            <Line
              yAxisId="power"
              dataKey={chart.key('power')}
              type="monotone"
              stroke={chart.color('orange.solid')}
              strokeWidth={3}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{r: 4}}
              connectNulls={true}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {HeartChart};
