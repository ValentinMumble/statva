import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group, SegmentGroupValueChangeDetails, Spacer, Span, Text} from '@chakra-ui/react';
import {SegmentedControl, Switch} from '../../components/ui';
import {EditEvents, EditLabels} from '../../components';
import {ChainEvent, formatDistance, getOptions, getRidesBetween, labelCollection, SUPER6} from '../../models';
import {useActivities, useEvents, useLabels} from '../../hooks';

const RETIRED_CHAINS = ['🍍', '🧄', '🍪', '🍌', '🍋'];
const RETIRED_BIKES = ['b11897955', 'b12655849'];

const ChainChart = () => {
  const [withRetired, setWithRetired] = useState<boolean>(false);
  const [gearId, setGearId] = useState<string>(SUPER6);
  const {label} = useLabels();
  const {events: chainEvents, refetch: refreshEvents} = useEvents<ChainEvent>('chain');

  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId,
  });

  const handleGearChange = ({value}: SegmentGroupValueChangeDetails) => value && setGearId(value);

  if (null === chainEvents) {
    return null;
  }

  const relevantBikes = [...new Set(chainEvents.map(({bike}) => bike))].filter(
    bike => withRetired || !RETIRED_BIKES.includes(bike)
  );
  const currentBikeEvents = chainEvents.filter(({bike}) => gearId === bike);

  const chainOdometer = currentBikeEvents.reduce((chainOdometer: Record<string, number[]>, event, index) => {
    if (RETIRED_CHAINS.includes(event.chain) && !withRetired) {
      return chainOdometer;
    }

    const nextEventDate = currentBikeEvents[index + 1]?.date;
    const periodDistance = getRidesBetween(activities ?? [], event.date, nextEventDate).reduce(
      (sum, ride) => ride.distance + sum,
      0
    );

    chainOdometer[event.chain] = [...(chainOdometer[event.chain] ?? []), periodDistance];

    return chainOdometer;
  }, {});

  const labels: string[] = [];
  const series: {name: string; data: (number | null)[]}[] = [];

  Object.entries(chainOdometer).forEach(([chain, distances], chainIndex) => {
    const totalDistance = distances.reduce((total, current) => total + current, 0);
    labels.push(`${chain} ${formatDistance(totalDistance / distances.length)} avg`);

    distances.forEach((distance, index) => {
      const data = new Array(Object.keys(chainOdometer).length).fill(null);
      data[chainIndex] = distance;
      series.push({name: `${chain}${index + 1}`, data});
    });
  });

  const totalFormatter = (value: string, {dataPointIndex}: {dataPointIndex: number}) => {
    const chains = Object.keys(chainOdometer);
    const isCurrentChain = dataPointIndex === chains.indexOf(currentBikeEvents.at(-1)?.chain ?? '');
    const chainEventCount = chainOdometer[chains[dataPointIndex]].length;

    return `${isCurrentChain ? '🔗 ' : ''}${formatDistance(Number(value), 0)} 〰 ${chainEventCount}`;
  };

  const chartOptions = getOptions(labels, value => formatDistance(value, 0));
  const bikeCollection = labelCollection(relevantBikes, key => label(key, true));

  const avg = Object.values(chainOdometer)
    .map(totals => totals.reduce((total, currentTotal) => total + currentTotal, 0))
    .filter(total => 0 < total)
    .reduce((total, currentTotal, _index, entries) => total + currentTotal / entries.length, 0);

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <Switch size="xs" checked={withRetired} onCheckedChange={({checked}) => setWithRetired(checked)}>
          🗄️
        </Switch>
        <Spacer />
        <Text>
          <Span fontStyle="italic">μ</Span> {formatDistance(avg)}
        </Text>
        <SegmentedControl size="sm" value={gearId} onValueChange={handleGearChange} items={bikeCollection.items} />
        <EditEvents onEditEvents={refreshEvents} />
        <EditLabels />
      </Group>
      <Chart
        options={{
          ...chartOptions,
          chart: {
            ...chartOptions.chart,
            stacked: true,
          },
          plotOptions: {
            bar: {
              dataLabels: {
                total: {
                  enabled: true,
                  formatter: totalFormatter,
                  style: {color: 'lightgray'},
                },
              },
            },
          },
          legend: {show: false},
        }}
        series={series}
        type="bar"
        height={400}
      />
    </>
  );
};

export {ChainChart};
