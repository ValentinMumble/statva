import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {eddingtonNumber, getRidesBeforeMonth} from '../models';

const options: ApexCharts.ApexOptions = {
  colors: ['#ca8c19'],
  stroke: {
    curve: 'smooth',
    width: 4,
  },
  fill: {type: 'gradient'},
  markers: {size: [4]},
  chart: {
    toolbar: {show: false},
    zoom: {enabled: false},
  },
};

type EddingtonChartProps = {
  startYear: number;
};

const EddingtonChart = ({startYear}: EddingtonChartProps) => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
  });

  const dataPerMonth = activities.reduce((eddingtonByMonth: {[monthYear: string]: number}, activity) => {
    const date = new Date(activity.start_date);

    if (date.getFullYear() < startYear) {
      return eddingtonByMonth;
    }

    const monthYear = `${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
    eddingtonByMonth[monthYear] = eddingtonNumber(getRidesBeforeMonth(activities, date))[0];

    return eddingtonByMonth;
  }, {});

  const labels = Object.keys(dataPerMonth);
  const series = [{name: '🧸', data: Object.values(dataPerMonth)}];

  return (
    <Chart
      options={{
        ...options,
        labels,
      }}
      series={series}
      type="line"
      height={400}
    />
  );
};

export {EddingtonChart};
