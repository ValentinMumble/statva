import {useState} from 'react';
import {Group} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {StepperInput} from '../../components/ui';
import {useActivities} from '../../hooks';
import {formatPower, formatSpeed} from '../../models';
import {ChartTooltip} from './ChartTooltip';

const DEFAULT_ITEM_COUNT = 50;

type ProgressChartProps = {
  search: string;
};

const ProgressChart = ({search}: ProgressChartProps) => {
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const {activities} = useActivities({
    search,
    withCommute: false,
    withPrivate: false,
    sort: 'date',
    sortDirection: 'asc',
  });

  const chart = useChart({
    data: (activities ?? []).slice(-itemCount).map(({average_speed, weighted_average_watts, start_date}) => ({
      timestamp: new Date(start_date).getTime(),
      speed: average_speed,
      power: weighted_average_watts ?? null,
    })),
    series: [
      {name: 'speed', color: 'gray.solid'},
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
                new Date(timestamp).toLocaleDateString('en-US', {month: 'short', year: '2-digit'})
              }
            />
            <YAxis
              yAxisId="speed"
              domain={[22 / 3.6, 40 / 3.6]}
              stroke={chart.color('fg.muted')}
              width={80}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => formatSpeed(Number(value))}
            />
            <YAxis
              yAxisId="power"
              orientation="right"
              domain={[120, 260]}
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

                const {timestamp, speed, power} = payload[0].payload as {
                  timestamp: number;
                  speed: number;
                  power: number | null;
                };

                return (
                  <ChartTooltip>
                    <div>{new Date(timestamp).toLocaleDateString('fr-FR')}</div>
                    <div>🏁 {formatSpeed(speed)}</div>
                    {null !== power && <div>⚡️ {formatPower(power)}</div>}
                  </ChartTooltip>
                );
              }}
            />
            <Line
              yAxisId="speed"
              dataKey={chart.key('speed')}
              type="monotone"
              stroke={chart.color('gray.solid')}
              strokeWidth={2}
              dot={false}
              activeDot={{r: 4}}
              isAnimationActive={false}
            />
            <Line
              yAxisId="power"
              dataKey={chart.key('power')}
              type="monotone"
              stroke={chart.color('orange.solid')}
              strokeWidth={2}
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

export {ProgressChart};
