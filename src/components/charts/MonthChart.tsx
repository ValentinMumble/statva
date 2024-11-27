import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group, SegmentGroupValueChangeDetails, Text, Span} from '@chakra-ui/react';
import {SegmentedControl, StepperInput} from '../ui';
import {useActivities, useLabels} from '../../hooks';
import {
  aggregateTimeframeData,
  ChartProps,
  getOptions,
  getTypes,
  labelCollection,
  Timeframe,
  TIMEFRAMES,
} from '../../models';
import {ActivityType} from '../../models/strava';

const TYPES: ActivityType[] = [ActivityType.Ride, ActivityType.Run, ActivityType.Swim, ActivityType.Tennis];

type MonthChartProps = ChartProps & {
  timeframe?: Timeframe;
  displayTypes?: boolean;
  excludedTypes?: ActivityType[];
};

const MonthChart = ({
  data,
  formatter,
  filter,
  timeframe: initialTimeframe = 'month',
  displayTypes = true,
  excludedTypes = [],
  ...rest
}: MonthChartProps) => {
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [type, setType] = useState<ActivityType>(ActivityType.Ride);
  const [itemCount, setItemCount] = useState<number>(TIMEFRAMES[initialTimeframe].initialItemCount);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(type),
    ...filter,
  });
  const [label] = useLabels();

  const handleTypeChange = ({value}: SegmentGroupValueChangeDetails) => setType(value as ActivityType);
  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
    setItemCount(TIMEFRAMES[newTimeframe].initialItemCount);
  };

  const dataPerPeriod = aggregateTimeframeData(activities ?? [], timeframe, data, itemCount);
  const labels = Object.keys(dataPerPeriod).map(key => label(key));
  const serieLabel = 'number' === typeof data ? filter?.search : label(data);
  const series = [{name: serieLabel, data: Object.values(dataPerPeriod)}];

  const avg = Object.values(dataPerPeriod).reduce(
    (total, currentTotal, _index, entries) => total + currentTotal / entries.length,
    0
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
      <Chart options={getOptions(labels, formatter)} series={series} type="bar" height={400} {...rest} />
    </>
  );
};

export {MonthChart};
