import {useState} from 'react';
import Chart from 'react-apexcharts';
import {useActivities, useLabels} from '../../hooks';
import {ChartProps, getOptions, getTypes} from '../../models';
import {ActivityType} from '../../models/strava';
import {GearSelect} from '../../components';

const GearChart = ({data, formatter, type, ...rest}: ChartProps) => {
  const [includedGear, setIncludedGear] = useState<string[] | null>(null);

  const [label] = useLabels();
  const [activities] = useActivities({
    withCommute: true,
    withPrivate: true,
    includedActivityTypes: getTypes(ActivityType.Ride, ActivityType.Run),
  });

  const dataPerGear = (activities ?? []).reduce((gearMap: Record<string, number>, activity) => {
    if (null === activity.gear_id) return gearMap;

    const valueToAdd = 'number' === typeof data ? data : Number(activity[data]);
    gearMap[activity.gear_id] = (gearMap[activity.gear_id] ?? 0) + valueToAdd;

    return gearMap;
  }, {});

  const sortedDesc = Object.fromEntries(
    Object.entries(dataPerGear)
      .filter(([gearId]) => null === includedGear || includedGear.includes(gearId))
      .sort(([, a], [, b]) => b - a)
  );
  const selectedGear = Object.keys(sortedDesc);
  const labels = selectedGear.map(gearId => label(gearId, true));
  const series =
    'pie' === type ? Object.values(sortedDesc) : [{name: label(data.toString()), data: Object.values(sortedDesc)}];

  return (
    <>
      <GearSelect
        multiple={true}
        selectedGear={null === includedGear ? selectedGear : includedGear}
        onSelectedGearChange={setIncludedGear}
      />
      <Chart
        options={getOptions(
          labels,
          formatter,
          'pie' === type
            ? {
                legend: {show: false},
                dataLabels: {
                  enabled: true,
                  formatter: (_, {seriesIndex}) => labels[seriesIndex],
                  dropShadow: {enabled: false},
                },
              }
            : {}
        )}
        series={series}
        type={type ?? 'bar'}
        height={400}
        {...rest}
      />
    </>
  );
};

export {GearChart};
