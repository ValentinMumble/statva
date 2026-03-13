import {useState} from 'react';
import Chart from 'react-apexcharts';
import {Group, Text, Span} from '@chakra-ui/react';
import {StepperInput} from '../ui';
import {useActivities, useLabels} from '../../hooks';
import {getOptions, formatSpeed} from '../../models';

const DEFAULT_ITEM_COUNT = 150;

const CommuteSpeedChart = () => {
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const [label] = useLabels();
  const [activities] = useActivities({
    withCommute: 'only',
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
  });

  const relevantActivities = (activities ?? []).slice(-itemCount);
  const labels = relevantActivities.map(activity => new Date(activity.start_date).toLocaleDateString('fr-FR'));
  const series = [
    {
      name: label('average_speed'),
      data: relevantActivities.map(activity => activity.average_speed), // m/s to km/h
    },
  ];

  const avg =
    relevantActivities.reduce((total, activity) => total + activity.average_speed, 0) / relevantActivities.length || 0;

  return (
    <>
      <Group width="full" justifyContent="end" gap="20px">
        <Text>
          <Span fontStyle="italic">μ</Span> {formatSpeed(avg)}
        </Text>
        <StepperInput
          size="xs"
          value={itemCount.toString()}
          onValueChange={({valueAsNumber}) => setItemCount(valueAsNumber)}
        />
      </Group>
      <Chart
        options={getOptions(labels, (value: number) => formatSpeed(value), {
          yaxis: {
            labels: {formatter: (value: number) => formatSpeed(value)},
            min: 10 / 3.6,
            max: 30 / 3.6,
          },
          colors: ['#446a30'],
          fill: {
            type: 'gradient',
            gradient: {
              type: 'vertical',
              gradientToColors: ['#da340a'],
            },
          },
          stroke: {
            curve: 'smooth',
            width: 3,
          },
          markers: {size: [0]},
          tooltip: {
            y: {
              formatter: (value: number) => formatSpeed(value),
            },
          },
        })}
        series={series}
        type="line"
        height={400}
      />
    </>
  );
};

export {CommuteSpeedChart};
