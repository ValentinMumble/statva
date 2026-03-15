import {useState} from 'react';
import Chart from 'react-apexcharts';
import {useActivities, useLabels} from '../../hooks';
import {aggregateActivityTypeCount, ChartProps, getOptions, labelCollection, Timeframe, TIMEFRAMES} from '../../models';
import {SegmentedControl, StepperInput} from '../ui';
import {Group, Checkbox} from '@chakra-ui/react';
import {TbBusStop} from 'react-icons/tb';

type ActivityTimeChartProps = Omit<ChartProps, 'data' | 'formatter'> & {
  timeframe?: Timeframe;
};

const ActivityTimeChart = ({filter, timeframe: initialTimeframe = 'month', ...rest}: ActivityTimeChartProps) => {
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
  const labels = Object.keys(dataPerPeriod).map(key => label(key));

  const distinctTypes: string[] = Object.values(dataPerPeriod).reduce(
    (types: string[], entry: Record<string, number> | null) =>
      null === entry ? types : [...new Set([...types, ...Object.keys(entry)])],
    []
  );

  const series = distinctTypes.map(type => ({
    name: type,
    data: Object.values(dataPerPeriod).map(value => value?.[type] ?? null),
  }));

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
      <Chart
        options={getOptions(labels, undefined, {
          chart: {
            stacked: true,
            background: 'transparent',
          },
        })}
        series={series}
        type="bar"
        height={400}
        {...rest}
      />
    </div>
  );
};

export {ActivityTimeChart};
