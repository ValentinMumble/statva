import Chart from 'react-apexcharts';
import {useFtpTests} from '../../hooks';

const options: ApexCharts.ApexOptions = {
  yaxis: [
    {
      labels: {
        formatter: (value: number) => `${Math.round(value)} W`,
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
  markers: {size: [4]},
  chart: {
    toolbar: {show: false},
    zoom: {enabled: false},
  },
};

const FTPChart = () => {
  const ftpTests = useFtpTests();
  const labels = ftpTests.map(({date}) => date.toLocaleDateString());
  const series = [
    {name: 'W', data: ftpTests.map(({ftp}) => ftp)},
    {name: 'W/kg', data: ftpTests.map(({ftp, weight}) => ftp / weight)},
  ];

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

export {FTPChart};
