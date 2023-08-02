import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {formatDistance} from '../models';

const options: ApexCharts.ApexOptions = {
  title: {
    text: 'Distance / year 🗺️',
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

const DistanceChart = () => {
  const activities = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'desc',
  });

  if (null === activities) {
    return null;
  }

  const distancePerYear = activities.reduce((yearMap: {[year: number]: number}, activity) => {
    const year = new Date(activity.start_date).getUTCFullYear();
    yearMap[year] = (yearMap[year] ?? 0) + activity.distance;

    return yearMap;
  }, {});

  const labels = Object.keys(distancePerYear);
  const series = [{name: 'Distance', data: Object.values(distancePerYear)}];

  return (
    <Chart
      options={{
        ...options,
        labels,
      }}
      series={series}
      type="bar"
      height={400}
    />
  );
};

export {DistanceChart};
