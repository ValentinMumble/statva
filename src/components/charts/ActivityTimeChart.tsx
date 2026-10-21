import {useState} from 'react';
import {Group, Checkbox} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {TbBusStop} from 'react-icons/tb';
import {useActivities, useLabels} from '../../hooks';
import {
  aggregateActivityTypeCount,
  ChartProps,
  getSeriesColor,
  labelCollection,
  Timeframe,
  TIMEFRAMES,
} from '../../models';
import {SegmentedControl, StepperInput} from '../ui';
import {ChartTooltip} from './ChartTooltip';

type ActivityTimeChartProps = Omit<ChartProps, 'data' | 'formatter'> & {
  timeframe?: Timeframe;
};

const ActivityTimeChart = ({filter, timeframe: initialTimeframe = 'month'}: ActivityTimeChartProps) => {
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [itemCount, setItemCount] = useState<number>(TIMEFRAMES[initialTimeframe].initialItemCount);
  const [withCommute, setWithCommute] = useState<boolean>(true);
  const {label} = useLabels();

  const {activities} = useActivities({
    withCommute: withCommute,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    ...filter,
  });

  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    setItemCount(TIMEFRAMES[newTimeframe].initialItemCount);
  };

  const toggleWithCommute = () => setWithCommute(withCommute => !withCommute);

  const dataPerPeriod = aggregateActivityTypeCount(activities ?? [], timeframe, itemCount);

  const distinctTypes: string[] = Object.values(dataPerPeriod).reduce(
    (types: string[], entry: Record<string, number> | null) =>
      null === entry ? types : [...new Set([...types, ...Object.keys(entry)])],
    [],
  );

  const rows: Record<string, string | number>[] = Object.entries(dataPerPeriod).map(([period, counts]) =>
    distinctTypes.reduce((row: Record<string, string | number>, type) => ({...row, [type]: counts?.[type] ?? 0}), {
      period: label(period),
    }),
  );

  const chart = useChart({
    data: rows,
    series: distinctTypes.map((name, index) => ({name, color: getSeriesColor(index)})),
  });

  return (
    <div>
      <Group width="full" justifyContent="end" gap="20px">
        <Checkbox.Root title="Commute" size="lg" checked={withCommute} onCheckedChange={toggleWithCommute}>
          <Checkbox.HiddenInput />
          <Checkbox.Control>
            <TbBusStop />
          </Checkbox.Control>
        </Checkbox.Root>
        <SegmentedControl
          size="sm"
          value={timeframe}
          onValueChange={({value}) => handleTimeframeChange(value as Timeframe)}
          items={labelCollection(Object.keys(TIMEFRAMES), label).items}
        />
        <StepperInput
          size="xs"
          value={itemCount.toString()}
          onValueChange={({valueAsNumber}) => setItemCount(valueAsNumber)}
        />
      </Group>
      <Chart.Root width="100%" height="400px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data}>
            <XAxis dataKey="period" stroke={chart.color('fg.muted')} tickLine={false} />
            <YAxis stroke={chart.color('fg.muted')} width={40} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{fill: chart.color('bg.muted')}}
              isAnimationActive={false}
              content={({payload, label: period, active}) => {
                if (!active || !payload?.length) return null;

                const entries = payload.filter(({value}) => 0 < Number(value));

                return (
                  <ChartTooltip>
                    <div>{period}</div>
                    {entries.map(({dataKey, value, color}) => (
                      <div key={String(dataKey)} style={{color}}>
                        {label(String(dataKey))} · {value}
                      </div>
                    ))}
                  </ChartTooltip>
                );
              }}
            />
            {chart.series.map(item => (
              <Bar
                key={item.name}
                dataKey={chart.key(item.name)}
                stackId="type"
                fill={chart.color(item.color)}
                fillOpacity={0.55}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Chart.Root>
    </div>
  );
};

export {ActivityTimeChart};
