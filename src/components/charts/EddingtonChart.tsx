import {useState} from 'react';
import Chart from 'react-apexcharts';
import {useActivities} from '../../hooks';
import {eddingtonNumber, getOptions, getRidesBeforeMonth, getTypes} from '../../models';
import {ActivityType} from '../../models/strava';
import {NumberInputField, NumberInputRoot} from '../../components/ui';

const DEFAULT_ITEM_COUNT = 18;

const options: ApexCharts.ApexOptions = {
  colors: ['#ca8c19'],
  stroke: {
    curve: 'smooth',
    width: 4,
  },
  yaxis: {min: 10},
  fill: {type: 'gradient'},
};

type EddingtonChartProps = {};

const EddingtonChart = ({}: EddingtonChartProps) => {
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    includedActivityTypes: getTypes(ActivityType.Ride),
  });

  const dataPerMonth = (activities ?? []).reduce((eddingtonByMonth: {[monthYear: string]: number}, activity) => {
    const date = new Date(activity.start_date);
    const monthYear = `${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
    eddingtonByMonth[monthYear] = eddingtonNumber(getRidesBeforeMonth(activities ?? [], date))[0];

    return eddingtonByMonth;
  }, {});

  const sliced = Object.fromEntries(Object.entries(dataPerMonth).slice(-itemCount));
  const labels = Object.keys(sliced);
  const series = [{name: '🧸', data: Object.values(sliced)}];

  return (
    <div>
      <div>
        <NumberInputRoot
          width="70px"
          size="xs"
          value={itemCount.toString()}
          onValueChange={details => setItemCount(details.valueAsNumber)}
        >
          <NumberInputField />
        </NumberInputRoot>
      </div>
      <Chart options={getOptions(labels, undefined, options)} series={series} type="line" height={400} />
    </div>
  );
};

export {EddingtonChart};
