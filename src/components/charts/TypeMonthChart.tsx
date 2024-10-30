import {useState} from 'react';
import Chart from 'react-apexcharts';
import {useActivities, useLabels} from '../../hooks';
import {ChartProps, generatePeriodKeys, getOptions, getWeekNumber} from '../../models';
import {NumberInputField, NumberInputRoot, SegmentedControl, Switch} from '../ui';
import {Group} from '@chakra-ui/react';

const INITIAL_MONTH_COUNT = 15;
const INITIAL_WEEK_COUNT = 26;

type TypeMonthChartProps = Omit<ChartProps, 'data' | 'dataLabel' | 'formatter'> & {
  timeframe?: string;
};

const TypeMonthChart = ({filter, timeframe: initialTimeframe = 'month', ...rest}: TypeMonthChartProps) => {
  const [timeframe, setTimeframe] = useState<string>(initialTimeframe);
  const [itemCount, setItemCount] = useState<number>(
    'month' === initialTimeframe ? INITIAL_MONTH_COUNT : INITIAL_WEEK_COUNT
  );
  const [withCommute, setWithCommute] = useState<boolean>(true);
  const [label] = useLabels();

  const [activities] = useActivities({
    withCommute: withCommute,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    ...filter,
  });

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    setItemCount('month' === newTimeframe ? INITIAL_MONTH_COUNT : INITIAL_WEEK_COUNT);
  };

  const handleCommuteChange = () => setWithCommute(withCommute => !withCommute);

  const dataPerPeriod = (activities ?? []).reduce(
    (periodMap: {[period: string]: {[type: string]: number} | null}, activity) => {
      const date = new Date(activity.start_date);
      const period =
        'week' === timeframe
          ? `${getWeekNumber(date)}/${date.getUTCFullYear()}`
          : `${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
      const data = periodMap[period] ?? {};
      const key = activity.commute ? 'Commute' : activity.sport_type;
      periodMap[period] = {...data, [key]: (data[key] ?? 0) + 1};

      return periodMap;
    },
    generatePeriodKeys(
      new Date((activities ?? []).at(0)?.start_date ?? 0),
      new Date((activities ?? []).at(-1)?.start_date ?? 0),
      timeframe
    )
  );

  const sliced = Object.fromEntries(Object.entries(dataPerPeriod).slice(-itemCount));
  const labels = 'week' === timeframe ? Object.keys(sliced).map(label) : Object.keys(sliced);

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
        <Switch id="commute-switch" size="sm" onChange={handleCommuteChange} checked={withCommute} />
        Commute
        <SegmentedControl
          size="sm"
          value={timeframe}
          onValueChange={({value}) => handleTimeframeChange(value)}
          items={['month', 'week']}
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

export {TypeMonthChart};
