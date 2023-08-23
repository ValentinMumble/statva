import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {GEARS, formatDuration} from '../models';

const options: ApexCharts.ApexOptions = {
  title: {
    text: 'Time / gear ⏱️',
    style: {
      fontSize: '18px',
    },
  },
  yaxis: {
    labels: {
      formatter: (value: number) => formatDuration(value),
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

const TimeChart = () => {
  const activities = useActivities({
    withCommute: true,
    withPrivate: true,
  });

  if (null === activities) {
    return null;
  }

  const timePerGear = activities.reduce((gearMap: {[gearId: string]: number}, activity) => {
    gearMap[activity.gear_id] = (gearMap[activity.gear_id] ?? 0) + activity.moving_time;

    return gearMap;
  }, {});

  const labels = Object.keys(timePerGear).map(gearId => GEARS[gearId]?.label ?? '🤷');
  const series = [{name: 'Time', data: Object.values(timePerGear)}];

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

export {TimeChart};
