import Chart from 'react-apexcharts';

type FTPTest = {
  date: Date;
  weight: number;
  ftp: number;
};

const FTP_TESTS: FTPTest[] = [
  {
    date: new Date('2023-10-15'),
    weight: 75,
    ftp: 234,
  },
  {
    date: new Date('2024-01-03'),
    weight: 72,
    ftp: 252,
  },
  {
    date: new Date('2024-04-13'),
    weight: 74,
    ftp: 256,
  },
];

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
  const labels = FTP_TESTS.map(({date}) => date.toLocaleDateString());
  const series = [
    {name: 'W', data: FTP_TESTS.map(({ftp}) => ftp)},
    {name: 'W/kg', data: FTP_TESTS.map(({ftp, weight}) => ftp / weight)},
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
