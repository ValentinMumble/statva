import {useState} from 'react';
import {Group} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {StepperInput} from '../ui';
import {useActivities, useLabels} from '../../hooks';
import {ChartProps, extractEmoji} from '../../models';
import {ChartTooltip} from './ChartTooltip';

const DEFAULT_ITEM_COUNT = 50;

type DataLineChartProps = ChartProps & {
  min?: number;
  max?: number;
};

const DataLineChart = ({data, min, max}: DataLineChartProps) => {
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const {label} = useLabels();
  const {activities} = useActivities({
    withCommute: false,
    withPrivate: false,
    sort: 'date',
    sortDirection: 'asc',
  });

  const isDataKey = 'number' !== typeof data;
  const relevantActivities = !isDataKey
    ? []
    : (activities ?? []).filter(activity => undefined !== activity[data]).slice(-itemCount);

  const chart = useChart({
    data: relevantActivities.map(activity => ({
      activity: extractEmoji(activity.name),
      value: Number(isDataKey ? (activity[data] ?? 0) : 0),
    })),
    series: [{name: 'value', color: 'green.solid'}],
  });

  if (!isDataKey) {
    return null;
  }

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
            <defs>
              <Chart.Gradient
                id="data-line-gradient"
                stops={[
                  {offset: 0, color: 'green.solid'},
                  {offset: 1, color: 'red.solid'},
                ]}
              />
            </defs>
            <XAxis dataKey="activity" stroke={chart.color('fg.muted')} tickLine={false} minTickGap={20} />
            <YAxis
              stroke={chart.color('fg.muted')}
              domain={[min ?? 'auto', max ?? 'auto']}
              width={60}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{stroke: chart.color('fg.muted'), strokeWidth: 1}}
              isAnimationActive={false}
              content={({payload, label: activity, active}) =>
                !active || !payload?.length ? null : (
                  <ChartTooltip>
                    {activity} · {label(data)} {payload[0].value}
                  </ChartTooltip>
                )
              }
            />
            <Line
              dataKey={chart.key('value')}
              type="monotone"
              stroke="url(#data-line-gradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{r: 4, fill: chart.color('green.solid')}}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {DataLineChart};
