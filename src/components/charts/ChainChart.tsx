import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {formatDistance, getOptions, getRidesBetween} from '../../models';

type ChainInstallEvent = {
  chain: string;
  date: Date;
};

const EVENTS: ChainInstallEvent[] = [
  {chain: '🍍', date: new Date('2023-11-15')},
  {chain: '🍌', date: new Date('2024-05-10')},
  {chain: '🍋', date: new Date('2024-05-22')},
  {chain: '🍌', date: new Date('2024-05-31')},
];

type ChainChartProps = {};

const ChainChart = ({}: ChainChartProps) => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId: 'b13440652',
  });

  const points: PointAnnotations[] = [];

  const chainOdometer = EVENTS.reduce((chainOdometer: {[chain: string]: number[]}, event, index) => {
    const nextEventDate = index === EVENTS.length - 1 ? null : EVENTS[index + 1].date;
    const periodDistance = getRidesBetween(activities, event.date, nextEventDate).reduce(
      (sum, ride) => ride.distance + sum,
      0
    );

    const [total, current] = chainOdometer[event.chain] ?? [0, 0];
    chainOdometer[event.chain] =
      null === nextEventDate ? [total, current + periodDistance] : [total + periodDistance, current];

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

  return (
    <Chart
      options={getOptions(labels, value => formatDistance(value, 0), {
        chart: {stacked: true},
        annotations: {points},
      })}
      series={series}
      type="bar"
      height={400}
    />
  );
};

export {ChainChart};
