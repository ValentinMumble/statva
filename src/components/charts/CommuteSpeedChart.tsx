import {useState} from 'react';
import {Group, Text, Span} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {StepperInput} from '../ui';
import {useActivities, useLabels} from '../../hooks';
import {formatSpeed} from '../../models';
import {ChartTooltip} from './ChartTooltip';

const DEFAULT_ITEM_COUNT = 150;
const SPEED_DOMAIN = [10 / 3.6, 30 / 3.6];

const CommuteSpeedChart = () => {
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const {label} = useLabels();
  const {activities} = useActivities({
    withCommute: 'only',
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
  });

  const relevantActivities = (activities ?? []).slice(-itemCount);

  const chart = useChart({
    data: relevantActivities.map(activity => ({
      date: new Date(activity.start_date).toLocaleDateString('fr-FR'),
      speed: activity.average_speed,
    })),
    series: [{name: 'speed', color: 'green.solid'}],
  });

  const avg =
    relevantActivities.reduce((total, activity) => total + activity.average_speed, 0) / relevantActivities.length || 0;

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <Text>
          <Span fontStyle="italic">μ</Span> {formatSpeed(avg)}
        </Text>
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
                id="commute-speed-gradient"
                stops={[
                  {offset: 0, color: 'green.solid'},
                  {offset: 1, color: 'red.solid'},
                ]}
              />
            </defs>
            <XAxis dataKey="date" stroke={chart.color('fg.muted')} tickLine={false} minTickGap={40} />
            <YAxis
              stroke={chart.color('fg.muted')}
              domain={SPEED_DOMAIN}
              width={80}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => formatSpeed(Number(value))}
            />
            <ReferenceLine y={avg} stroke={chart.color('fg.muted')} strokeDasharray="5 4" />
            <Tooltip
              cursor={{stroke: chart.color('fg.muted'), strokeWidth: 1}}
              isAnimationActive={false}
              content={({payload, label: date, active}) =>
                !active || !payload?.length ? null : (
                  <ChartTooltip>
                    {date} · {label('average_speed')} {formatSpeed(Number(payload[0].value))}
                  </ChartTooltip>
                )
              }
            />
            <Line
              dataKey={chart.key('speed')}
              type="monotone"
              stroke="url(#commute-speed-gradient)"
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

export {CommuteSpeedChart};
