import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {DetailedActivity, formatDistance} from '../models';

const options: ApexCharts.ApexOptions = {
  title: {
    style: {
      fontSize: '18px',
    },
  },
  yaxis: {
    labels: {
      formatter: (value: number) => formatDistance(value),
    },
  },
  chart: {
    toolbar: {show: false},
    zoom: {enabled: false},
  },
  dataLabels: {
    enabled: false,
  },
  colors: ['darkOrange'],
};

type YearChartProps = {
  [K in keyof DetailedActivity]: {
    data: K;
    title: string;
  };
}[keyof DetailedActivity];

const YearChart = ({title, data}: YearChartProps) => {
  const activities = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'desc',
  });

  if (null === activities) {
    return null;
  }

  const dataPerYear = activities.reduce((yearMap: {[year: number]: number}, activity) => {
    const year = new Date(activity.start_date).getUTCFullYear();
    yearMap[year] = (yearMap[year] ?? 0) + (activity[data] as number);

    return yearMap;
  }, {});

  const labels = Object.keys(dataPerYear);
  const series = [{name: data, data: Object.values(dataPerYear)}];

  return (
    <Chart
      options={{
        ...options,
        labels,
        title: {
          ...options.title,
          text: title,
        },
      }}
      series={series}
      type="bar"
      height={400}
    />
  );
};

export {YearChart};
