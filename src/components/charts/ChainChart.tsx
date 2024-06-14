import Chart from 'react-apexcharts';
import {useActivities, useChainEvents} from '../../hooks';
import {formatDistance, getOptions, getRidesBetween} from '../../models';

type ChainChartProps = {};

const ChainChart = ({}: ChainChartProps) => {
  const events = useChainEvents();
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId: 'b13440652',
  });

  const points: PointAnnotations[] = [];

  const chainOdometer = events.reduce((chainOdometer: {[chain: string]: number[]}, event, index) => {
    const nextEventDate = index === events.length - 1 ? null : events[index + 1].date;
    const periodDistance = getRidesBetween(activities, event.date, nextEventDate).reduce(
      (sum, ride) => ride.distance + sum,
      0
    );

    const [total, current, eventCount] = chainOdometer[event.chain] ?? [0, 0, 0];
    chainOdometer[event.chain] =
      null === nextEventDate
        ? [total, current + periodDistance, eventCount + 1]
        : [total + periodDistance, current, eventCount + 1];

    points.push({
      x: event.chain,
      y: total,
      marker: {size: 0},
      label: {
        borderWidth: 0,
        offsetY: 20,
        text: `🔗`,
        style: {background: 'transparent', fontSize: '20px'},
      },
    });

    return chainOdometer;
  }, {});

  const labels = Object.keys(chainOdometer);
  const series = [
    {
      name: 'Total',
      data: Object.values(chainOdometer).map(([total]) => total),
    },
    {
      name: 'Current',
      data: Object.values(chainOdometer).map(([, current]) => current),
    },
  ];

  const avgFormatter = (_value: number, options: any) => {
    const [total, current, eventCount] = Object.values(chainOdometer)[options.dataPointIndex];

    return `${formatDistance((total + current) / eventCount, 0)} avg`;
  };

  return (
    <Chart
      options={getOptions(labels, value => formatDistance(value, 0), {
        chart: {stacked: true},
        annotations: {points},
        dataLabels: {enabled: true, formatter: avgFormatter},
      })}
      series={series}
      type="bar"
      height={400}
    />
  );
};

export {ChainChart};
