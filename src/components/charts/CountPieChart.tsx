import {Group, Span, Text} from '@chakra-ui/react';
import Chart from 'react-apexcharts';
import {getOptions} from '../../models';

type CountPieChartProps = {
  data: Record<string, number>;
  labels: string[];
  entityName: string;
  unitName: string;
};

const CountPieChart = ({data, labels, entityName, unitName}: CountPieChartProps) => {
  const series = Object.values(data);
  const seriesAvg = Math.round(series.reduce((acc, val) => acc + val, 0) / series.length) ?? 0;

  return (
    <>
      <Group width="full" gap="20px">
        <Text>
          <Span fontStyle="italic">{entityName} count</Span> {labels.length}
        </Text>
        <Text>
          <Span fontStyle="italic">μ</Span> {seriesAvg} {unitName}
        </Text>
      </Group>
      <Chart
        options={getOptions(labels, undefined, {
          legend: {show: false},
          dataLabels: {
            enabled: true,
            formatter: (_, opts) => labels[opts?.seriesIndex ?? 0],
            dropShadow: {enabled: false},
          },
        })}
        series={series}
        type="pie"
        height={400}
      />
    </>
  );
};

export {CountPieChart};
