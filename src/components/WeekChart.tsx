import {Chart, useChart} from '@chakra-ui/charts';
import {Stat} from '@chakra-ui/react';
import {Area, AreaChart, Tooltip} from 'recharts';
import {Activity} from '../models/strava';
import {TIMEFRAMES} from '../models';

const DISPLAYED_WEEKS = 8;

type WeekChartProps = {
  activities: Activity[];
};

const WeekChart = ({activities}: WeekChartProps) => {
  const dataPerWeek = (activities ?? []).reduce((weekMap: {[weekId: string]: number}, activity) => {
    const date = new Date(activity.start_date);
    const weekId = TIMEFRAMES.week.getPeriodKey(date);
    weekMap[weekId] = (weekMap[weekId] ?? 0) + (activity.suffer_score ?? 0);

    return weekMap;
  }, {});

  const chart = useChart({
    data: Object.entries(dataPerWeek)
      .slice(-DISPLAYED_WEEKS)
      .map(([weekId, effort]) => ({
        week: weekId,
        value: effort,
      })),
    series: [{name: 'value', color: 'orange.solid'}],
  });

  return (
    <Stat.Root>
      <Chart.Root width="80%" height="57px" chart={chart}>
        <AreaChart data={chart.data}>
          <defs>
            <Chart.Gradient
              id="sp-gradient"
              stops={[
                {offset: 0, color: 'orange.solid', opacity: 0.8},
                {offset: 1, color: 'orange.solid', opacity: 0.4},
              ]}
            />
          </defs>
          <Tooltip
            cursor={{stroke: chart.color('orange.solid'), strokeWidth: 2}}
            content={({payload}) => payload && payload.length > 0 ? payload[0].value : null}
            isAnimationActive={false}
          />
          {chart.series.map(item => (
            <Area
              key={item.name}
              activeDot={{stroke: chart.color('bg')}}
              isAnimationActive={false}
              dataKey={chart.key(item.name)}
              fill={`url(#sp-gradient)`}
              fillOpacity={0.2}
              stroke={chart.color(item.color)}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </Chart.Root>
      <Stat.HelpText fontSize=".8em">Week trend</Stat.HelpText>
    </Stat.Root>
  );
};

export {WeekChart};
