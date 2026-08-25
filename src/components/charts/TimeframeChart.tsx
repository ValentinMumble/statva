import {useState} from 'react';
import {Group, SegmentGroupValueChangeDetails, Text, Span} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {SegmentedControl, StepperInput} from '../ui';
import {useActivities, useLabels} from '../../hooks';
import {
  aggregateTimeframeData,
  ChartProps,
  getTypes,
  labelCollection,
  Timeframe,
  TIMEFRAMES,
} from '../../models';
import {ActivityType} from '../../models/strava';
import {ChartTooltip} from './ChartTooltip';

const TYPES: ActivityType[] = [ActivityType.Ride, ActivityType.Run, ActivityType.Swim, ActivityType.Tennis];

type TimeframeChartProps = ChartProps & {
  timeframe?: Timeframe;
  displayTypes?: boolean;
  excludedTypes?: ActivityType[];
};

const TimeframeChart = ({
  data,
  formatter,
  filter,
  type: chartType = 'bar',
  timeframe: initialTimeframe = 'month',
  displayTypes = true,
  excludedTypes = [],
}: TimeframeChartProps) => {
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [type, setType] = useState<ActivityType>(ActivityType.Ride);
  const [itemCount, setItemCount] = useState<number>(TIMEFRAMES[initialTimeframe].initialItemCount);
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: displayTypes ? getTypes(type) : undefined,
    ...filter,
  });
  const {label} = useLabels();

  const handleTypeChange = ({value}: SegmentGroupValueChangeDetails) => setType(value as ActivityType);
  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    setItemCount(TIMEFRAMES[newTimeframe].initialItemCount);
  };

  const dataPerPeriod = aggregateTimeframeData(activities ?? [], timeframe, data, itemCount);
  const serieLabel = 'number' === typeof data ? filter?.search ?? '' : label(data);

  const chart = useChart({
    data: Object.entries(dataPerPeriod).map(([period, value]) => ({period: label(period), value})),
    series: [{name: 'value', color: 'orange.solid'}],
  });

  const avg = Object.values(dataPerPeriod).reduce(
    (total, currentTotal, _index, entries) => total + currentTotal / entries.length,
    0
  );

  const renderTooltip = () => (
    <Tooltip
      cursor={'area' === chartType ? {stroke: chart.color('orange.solid'), strokeWidth: 1} : {fill: chart.color('bg.muted')}}
      isAnimationActive={false}
      content={({payload, label: period, active}) =>
        !active || !payload?.length ? null : (
          <ChartTooltip>
            {period} · {serieLabel} {formatter?.(Number(payload[0].value)) ?? payload[0].value}
          </ChartTooltip>
        )
      }
    />
  );

  const renderAxes = () => (
    <>
      <XAxis dataKey="period" stroke={chart.color('fg.muted')} tickLine={false} />
      <YAxis
        stroke={chart.color('fg.muted')}
        width={70}
        tickLine={false}
        axisLine={false}
        tickFormatter={value => formatter?.(Number(value)) ?? String(value)}
      />
      <ReferenceLine y={avg} stroke={chart.color('fg.muted')} strokeDasharray="5 4" />
    </>
  );

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <Text>
          <Span fontStyle="italic">μ</Span> {formatter?.(avg)}
        </Text>
        {displayTypes && (
          <SegmentedControl
            value={type}
            size="sm"
            onValueChange={handleTypeChange}
            items={
              labelCollection(
                TYPES.filter(type => !excludedTypes.includes(type)),
                label
              ).items
            }
          />
        )}
        <SegmentedControl
          value={timeframe}
          size="sm"
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
          {'area' === chartType ? (
            <AreaChart data={chart.data}>
              <defs>
                <Chart.Gradient
                  id="timeframe-gradient"
                  stops={[
                    {offset: 0, color: 'orange.solid', opacity: 0.6},
                    {offset: 1, color: 'orange.solid', opacity: 0.1},
                  ]}
                />
              </defs>
              {renderAxes()}
              {renderTooltip()}
              <Area
                dataKey={chart.key('value')}
                fill="url(#timeframe-gradient)"
                stroke={chart.color('orange.solid')}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <BarChart data={chart.data}>
              {renderAxes()}
              {renderTooltip()}
              <Bar
                dataKey={chart.key('value')}
                fill={chart.color('orange.solid')}
                fillOpacity={0.55}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Chart.Root>
    </>
  );
};

export {TimeframeChart};
