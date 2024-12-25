import Chart from 'react-apexcharts';
import {useActivityMeta} from '../../hooks';
import {computeFinishCount, getOptions} from '../../models';

const FinishChart = () => {
  const [activityMeta] = useActivityMeta();

  const finishMap = computeFinishCount(Object.values(activityMeta));
  const labels = Object.keys(finishMap);
  const series = Object.values(finishMap);

  return (
    <>
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
