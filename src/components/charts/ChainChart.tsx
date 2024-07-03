import Chart from 'react-apexcharts';
import {useActivities, useChainEvents} from '../../hooks';
import {formatDistance, getOptions, getRidesBetween} from '../../models';

const ChainChart = () => {
  const events = useChainEvents();
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId: 'b13440652',
  });

  const chainOdometer = events.reduce((chainOdometer: {[chain: string]: number[]}, event, index) => {
    const nextEventDate = index === events.length - 1 ? null : events[index + 1].date;
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
    labels.push(`${chain} ${formatDistance(totalDistance / distances.length, 0)} avg`);

    distances.forEach((distance, index) => {
      const data = new Array(Object.keys(chainOdometer).length).fill(null);
      data[chainIndex] = distance;
      series.push({name: `${chain}${index + 1}`, data});
    });
  });

  const totalFormatter = (value: string, options: any) => {
    const isCurrentChain = options.dataPointIndex === Object.keys(chainOdometer).indexOf(events.at(-1)?.chain ?? '');

    return `${isCurrentChain ? '🔗 ' : ''}${formatDistance(Number(value), 0)}`;
  };

  return (
    <Chart
      options={getOptions(labels, value => formatDistance(value, 0), {
        chart: {stacked: true},
        plotOptions: {
          bar: {
            dataLabels: {
              total: {
                enabled: true,
                formatter: totalFormatter,
              },
            },
          },
        },
      })}
      series={series}
      type="bar"
      height={400}
    />
  );
};

export {ChainChart};
