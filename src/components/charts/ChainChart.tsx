import {ChangeEvent, useEffect, useState} from 'react';
import Chart from 'react-apexcharts';
import {FormControl, Select} from '@chakra-ui/react';
import {ChainEvent, useActivities, useAthlete, useEvents} from '../../hooks';
import {formatDistance, getGearEmoji, getOptions, getRidesBetween} from '../../models';
import {AddEvent} from '../../components';

const ChainChart = () => {
  const [gearId, setGearId] = useState<string>();
  const athlete = useAthlete();
  const [events, refreshEvents] = useEvents<ChainEvent>('chain');
  const relevantBikes = [...new Set(events.map(({bike}) => bike))];
  const currentBikeEvents = events.filter(({bike}) => gearId === bike);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId,
  });

  const handleGearChange = ({target}: ChangeEvent<HTMLSelectElement>) => setGearId(target.value);

  const chainOdometer = currentBikeEvents.reduce((chainOdometer: {[chain: string]: number[]}, event, index) => {
    const nextEventDate = index === currentBikeEvents.length - 1 ? null : currentBikeEvents[index + 1].date;
    const periodDistance = getRidesBetween(activities, event.date, nextEventDate).reduce(
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

  useEffect(() => {
    setGearId(relevantBikes[0]);
  }, [relevantBikes.length]);

  return (
    <div>
      <FormControl display="flex" alignItems="center" justifyContent="end" paddingEnd="6px">
        <Select size="sm" width="70px" value={gearId} onChange={handleGearChange}>
          {relevantBikes.map(id => (
            <option key={id} value={id}>
              {getGearEmoji(athlete, id)}
            </option>
          ))}
        </Select>
      </FormControl>
      <Chart
        options={getOptions(labels, value => formatDistance(value, 0), {
          chart: {
            stacked: true,
            background: 'transparent',
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
        })}
        series={series}
        type="bar"
        height={400}
      />
      <AddEvent onAddEvent={refreshEvents} />
    </div>
  );
};

export {ChainChart};
