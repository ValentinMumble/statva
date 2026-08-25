import {useState} from 'react';
import {Group} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {StepperInput} from '../../components/ui';
import {useActivities} from '../../hooks';
import {eddingtonNumber, getRidesBeforeMonth, getTypes} from '../../models';
import {ActivityType} from '../../models/strava';
import {ChartTooltip} from './ChartTooltip';

const DEFAULT_ITEM_COUNT = 18;

const EddingtonChart = () => {
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(ActivityType.Ride),
  });

  const dataPerMonth = (activities ?? []).reduce((eddingtonByMonth: {[monthYear: string]: number}, activity) => {
    const date = new Date(activity.start_date);
    const monthYear = `${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
    eddingtonByMonth[monthYear] = eddingtonNumber(getRidesBeforeMonth(activities ?? [], date))[0];

    return eddingtonByMonth;
  }, {});

  const chart = useChart({
    data: Object.entries(dataPerMonth)
      .slice(-itemCount)
      .map(([month, eddington]) => ({month, eddington})),
    series: [{name: 'eddington', color: 'yellow.solid'}],
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
          <AreaChart data={chart.data}>
            <defs>
              <Chart.Gradient
                id="eddington-gradient"
                stops={[
                  {offset: 0, color: 'yellow.solid', opacity: 0.5},
                  {offset: 1, color: 'yellow.solid', opacity: 0.05},
                ]}
              />
            </defs>
            <XAxis dataKey="month" stroke={chart.color('fg.muted')} tickLine={false} minTickGap={20} />
            <YAxis
              stroke={chart.color('fg.muted')}
              domain={[10, 'auto']}
              width={50}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{stroke: chart.color('fg.muted'), strokeWidth: 1}}
              isAnimationActive={false}
              content={({payload, label: month, active}) =>
                !active || !payload?.length ? null : (
                  <ChartTooltip>
                    {month} · 🧸 {payload[0].value}
                  </ChartTooltip>
                )
              }
            />
            <Area
              dataKey={chart.key('eddington')}
              type="monotone"
              fill="url(#eddington-gradient)"
              stroke={chart.color('yellow.solid')}
              strokeWidth={3}
              dot={false}
              activeDot={{r: 4}}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {EddingtonChart};
