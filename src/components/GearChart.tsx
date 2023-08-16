import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {GEARS, formatDistance} from '../models';

const options: ApexCharts.ApexOptions = {
  title: {
    text: 'Distance / gear 🚲',
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

const GearChart = () => {
  const activities = useActivities({
    withCommute: true,
    withPrivate: true,
  });

  if (null === activities) {
    return null;
  }

  const distancePerGear = activities.reduce((gearMap: {[gearId: string]: number}, activity) => {
    gearMap[activity.gear_id] = (gearMap[activity.gear_id] ?? 0) + activity.distance;

    return gearMap;
  }, {});

  const labels = Object.keys(distancePerGear).map(gearId => GEARS[gearId]?.label ?? '🤷');
  const series = [{name: 'Distance', data: Object.values(distancePerGear)}];

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

export {GearChart};
