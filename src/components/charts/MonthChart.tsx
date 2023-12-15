import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {ChartProps, getOptions} from '../../models';

const MonthChart = ({data, dataLabel, formatter, filter, ...rest}: ChartProps) => {
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    ...filter,
  });

  const dataPerMonth = activities.reduce((yearMap: {[monthYear: string]: number}, activity) => {
    const date = new Date(activity.start_date);
    const monthYear = `${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
    yearMap[monthYear] = (yearMap[monthYear] ?? 0) + (activity[data] as number);

    return yearMap;
  }, {});

  const labels = Object.keys(dataPerMonth);
  const series = [{name: dataLabel, data: Object.values(dataPerMonth)}];

  return <Chart options={getOptions(labels, formatter)} series={series} type="bar" height={400} {...rest} />;
};

export {MonthChart};
