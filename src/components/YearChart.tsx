import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {ChartProps, getOptions} from '../models';

const YearChart = ({title, data, formatter}: ChartProps) => {
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

  return <Chart options={getOptions(title, labels, formatter)} series={series} type="bar" height={400} />;
};

export {YearChart};
