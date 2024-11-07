import Chart from 'react-apexcharts';
import {useFtp} from '../../hooks';
import {formatPower, getOptions} from '../../models';

const options: ApexCharts.ApexOptions = {
  yaxis: [
    {
      labels: {
        formatter: formatPower,
      },
      min: 150,
      max: 350,
    },
    {
      opposite: true,
      labels: {
        formatter: (value: number) => `${value.toFixed(1)} W/kg`,
      },
      min: 2,
      max: 4,
    },
  ],
  colors: ['#e09200', '#ebcf6c'],
  fill: {type: 'gradient'},
};

const FTPChart = () => {
  const [, ftpTests] = useFtp();
  const labels = ftpTests.map(({date}) => date.toLocaleDateString());
  const series = [
    {name: 'W', data: ftpTests.map(({ftp}) => ftp)},
    {name: 'W/kg', data: ftpTests.map(({ftp, weight}) => ftp / weight)},
  ];

  return <Chart options={getOptions(labels, undefined, options)} series={series} type="line" height={400} />;
};

export {FTPChart};
