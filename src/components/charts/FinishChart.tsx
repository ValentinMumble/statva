import {Group, Span, Text} from '@chakra-ui/react';
import Chart from 'react-apexcharts';
import {useActivityMeta, useLabels} from '../../hooks';
import {computeFinishCount, getOptions} from '../../models';

const FinishChart = () => {
  const [activityMeta] = useActivityMeta();
  const [label] = useLabels();

  const finishMap = computeFinishCount(Object.values(activityMeta));
  const labels = Object.keys(finishMap).map(key => label(key));
  const series = Object.values(finishMap);

  const seriesAvg = Math.round(series.reduce((acc, val) => acc + val, 0) / series.length);

  return (
    <>
      <Group width="full" gap="20px">
        <Text>
          <Span fontStyle="italic">Unique bars</Span> {labels.length}
        </Text>
        <Text>
          <Span fontStyle="italic">μ</Span> {seriesAvg} finish
        </Text>
      </Group>
      <Chart
        options={getOptions(labels, undefined, {
          legend: {show: false},
          dataLabels: {
            enabled: true,
            formatter: (_, {seriesIndex}) => labels[seriesIndex],
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

export {FinishChart};
