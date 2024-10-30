import {useEffect, useState} from 'react';
import Chart from 'react-apexcharts';
import {createListCollection, Group, SelectValueChangeDetails, SelectValueText} from '@chakra-ui/react';
import {SelectRoot, SelectContent, SelectItem, SelectTrigger} from '../../components/ui';
import {EditEvents} from '../../components';
import {ChainEvent, formatDistance, getGearEmoji, getOptions, getRidesBetween} from '../../models';
import {useActivities, useAthlete, useEvents} from '../../hooks';
import {EditLabels} from '../EditLabels';

const ChainChart = () => {
  const [gearIds, setGearIds] = useState<string[]>([]);
  const athlete = useAthlete();
  const [events, refreshEvents] = useEvents<ChainEvent>('chain');
  const relevantBikes = [...new Set(events.map(({bike}) => bike))];
  const currentBikeEvents = events.filter(({bike}) => gearIds.includes(bike));
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId: gearIds[0],
  });

  const handleGearChange = ({value}: SelectValueChangeDetails) => setGearIds(value);

  const chainOdometer = currentBikeEvents.reduce((chainOdometer: {[chain: string]: number[]}, event, index) => {
    const nextEventDate = index === currentBikeEvents.length - 1 ? null : currentBikeEvents[index + 1].date;
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

  const totalFormatter = (value: string, options: any) => {
    const isCurrentChain =
      options.dataPointIndex === Object.keys(chainOdometer).indexOf(currentBikeEvents.at(-1)?.chain ?? '');

    return `${isCurrentChain ? '🔗 ' : ''}${formatDistance(Number(value), 0)}`;
  };

  const chartOptions = getOptions(labels, value => formatDistance(value, 0));
  const bikeCollection = createListCollection({
    items: relevantBikes.map(bike => ({value: bike, label: getGearEmoji(athlete, bike)})),
  });

  useEffect(() => {
    setGearIds([relevantBikes[0]]);
  }, [relevantBikes.length]);

  return (
    <>
      <Group width="full" justifyContent="end">
        <SelectRoot width="70px" collection={bikeCollection} value={gearIds} onValueChange={handleGearChange}>
          <SelectTrigger>
            <SelectValueText placeholder="⚙️" />
          </SelectTrigger>
          <SelectContent>
            {bikeCollection.items.map(bike => (
              <SelectItem item={bike} key={bike.value}>
                {bike.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
        <EditEvents events={events} onEditEvents={refreshEvents} />
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
