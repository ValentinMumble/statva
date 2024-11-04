import {useState} from 'react';
import Chart from 'react-apexcharts';
import {useActivities, useLabels} from '../../hooks';
import {ChartProps, generatePeriodKeys, getOptions, labelCollection, Timeframe, TIMEFRAMES} from '../../models';
import {Checkbox, NumberInputField, NumberInputRoot, SegmentedControl} from '../ui';
import {Group} from '@chakra-ui/react';
import {TbBusStop} from 'react-icons/tb';

type ActivityTimeChartProps = Omit<ChartProps, 'data' | 'dataLabel' | 'formatter'> & {
  timeframe?: Timeframe;
};

const ActivityTimeChart = ({filter, timeframe: initialTimeframe = 'month', ...rest}: ActivityTimeChartProps) => {
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [itemCount, setItemCount] = useState<number>(TIMEFRAMES[initialTimeframe].initialItemCount);
  const [withCommute, setWithCommute] = useState<boolean>(true);
  const [label] = useLabels();

  const [activities] = useActivities({
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

  const dataPerPeriod = (activities ?? []).reduce(
    (periodMap: {[period: string]: {[type: string]: number} | null}, activity) => {
      const date = new Date(activity.start_date);
      const periodKey = TIMEFRAMES[timeframe].getPeriodKey(date);
      const data = periodMap[periodKey] ?? {};
      const key = activity.commute ? 'Commute' : activity.sport_type;
      periodMap[periodKey] = {...data, [key]: (data[key] ?? 0) + 1};

      return periodMap;
    },
    generatePeriodKeys(
      new Date((activities ?? []).at(0)?.start_date ?? 0),
      new Date((activities ?? []).at(-1)?.start_date ?? 0),
      timeframe
    )
  );

  const sliced = Object.fromEntries(Object.entries(dataPerPeriod).slice(-itemCount));
  const labels = Object.keys(sliced).map(key => label(key));

  const distinctTypes: string[] = Object.values(sliced).reduce(
    (types: string[], entry: {[type: string]: number} | null) =>
      null === entry ? types : [...new Set([...types, ...Object.keys(entry)])],
    []
  );

  const series = distinctTypes.map(type => ({
    name: type,
    data: Object.values(sliced).map(value => value?.[type] ?? null),
  }));

  return (
    <div>
      <Group width="full" justifyContent="end" gap="20px">
        <Checkbox
          title="Commute"
          size="lg"
          checked={withCommute}
          onCheckedChange={toggleWithCommute}
          icon={<TbBusStop />}
        />
        <SegmentedControl
          size="sm"
          value={timeframe}
          onValueChange={({value}) => handleTimeframeChange(value as Timeframe)}
          items={labelCollection(Object.keys(TIMEFRAMES), label).items}
        />
        <NumberInputRoot
          width="70px"
          size="xs"
          value={itemCount.toString()}
          onValueChange={details => setItemCount(details.valueAsNumber)}
        >
          <NumberInputField />
        </NumberInputRoot>
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
