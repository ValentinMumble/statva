import {useEffect, useState} from 'react';
import Chart from 'react-apexcharts';
import {Group, SegmentGroupValueChangeDetails, Span, Text} from '@chakra-ui/react';
import {SegmentedControl, Skeleton} from '../../components/ui';
import {EditEvents} from '../../components';
import {ChainEvent, formatDistance, getOptions, getRidesBetween, labelCollection, SUPER6} from '../../models';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {EditLabels} from '../EditLabels';

const ChainChart = () => {
  const [gearId, setGearId] = useState<string>(SUPER6);
  const [label] = useLabels();
  const [events, refreshEvents] = useEvents<ChainEvent>('chain');
  const relevantBikes = [...new Set((events ?? []).map(({bike}) => bike))];
  const currentBikeEvents = (events ?? []).filter(({bike}) => gearId === bike);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId,
  });

  const handleGearChange = ({value}: SegmentGroupValueChangeDetails) => setGearId(value);

  const chainOdometer = currentBikeEvents.reduce((chainOdometer: {[chain: string]: number[]}, event, index) => {
    const nextEventDate = currentBikeEvents[index + 1]?.date;
    const periodDistance = getRidesBetween(activities ?? [], event.date, nextEventDate).reduce(
      (sum, ride) => ride.distance + sum,
      0
    );

    chainOdometer[event.chain] = [...(chainOdometer[event.chain] ?? []), periodDistance];

    return chainOdometer;
  }, {});

  const labels: string[] = [];
  const series: ApexAxisChartSeries = [];

  Object.entries(chainOdometer).forEach(([chain, distances], chainIndex) => {
    const totalDistance = distances.reduce((total, current) => total + current, 0);
    labels.push(`${chain} ${formatDistance(totalDistance / distances.length)} avg`);

    distances.forEach((distance, index) => {
      const data = new Array(Object.keys(chainOdometer).length).fill(null);
      data[chainIndex] = distance;
      series.push({name: `${chain}${index + 1}`, data});
    });
  });

  const totalFormatter = (value: string, options: {dataPointIndex: number}) => {
    const isCurrentChain =
      options.dataPointIndex === Object.keys(chainOdometer).indexOf(currentBikeEvents.at(-1)?.chain ?? '');

    return `${isCurrentChain ? '🔗 ' : ''}${formatDistance(Number(value), 0)}`;
  };

  const chartOptions = getOptions(labels, value => formatDistance(value, 0));
  const bikeCollection = labelCollection(relevantBikes, label, true);

  useEffect(() => {
    setGearId(relevantBikes[0]);
  }, [relevantBikes.length]);

  if (null === events) {
    return <Skeleton height="200px" />;
  }

  const avg = Object.values(chainOdometer)
    .map(totals => totals.reduce((total, currentTotal) => total + currentTotal, 0))
    .filter(total => 0 < total)
    .reduce((total, currentTotal, _index, entries) => total + currentTotal / entries.length, 0);

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
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
