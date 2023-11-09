import Chart from 'react-apexcharts';
import {useActivities} from '../hooks';
import {ChartProps, getOptions} from '../models';

const MonthChart = ({data, formatter, filter}: ChartProps) => {
  const activities = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    ...filter,
  });

  if (null === activities) {
    return null;
  }

  const dataPerMonth = activities.reduce((yearMap: {[monthYear: string]: number}, activity) => {
    const date = new Date(activity.start_date);
    const monthYear = `${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCFullYear()}`;
    yearMap[monthYear] = (yearMap[monthYear] ?? 0) + (activity[data] as number);

    return yearMap;
  }, {});

  const labels = Object.keys(dataPerMonth);
  const series = [{name: data, data: Object.values(dataPerMonth)}];

  return <Chart options={getOptions(labels, formatter)} series={series} type="bar" height={400} />;
};

export {MonthChart};
