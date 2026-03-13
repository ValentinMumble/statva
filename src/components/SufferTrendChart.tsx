import {useState, MouseEvent} from 'react';
import {IconButton, Stat, StatRootProps} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Area, AreaChart, ResponsiveContainer, Tooltip} from 'recharts';
import {LuPlus, LuMinus} from 'react-icons/lu';
import {Activity} from '../models/strava';
import {Timeframe, TIMEFRAMES} from '../models';

type SufferTrendChartProps = {
  activities: Activity[];
  timeframe: Timeframe;
} & StatRootProps;

const SufferTrendChart = ({activities, timeframe, ...rest}: SufferTrendChartProps) => {
  const [displayedWeeks, setDisplayedWeeks] = useState(8);

  const handleExpandWeeks = (event: MouseEvent) => {
    setDisplayedWeeks(prev => prev + 1);
    event.stopPropagation();
  };

  const handleShrinkWeeks = (event: MouseEvent) => {
    setDisplayedWeeks(prev => Math.max(1, prev - 1));
    event.stopPropagation();
  };

  const dataPerWeek = (activities ?? []).reduce((weekMap: Record<string, number>, activity) => {
    const date = new Date(activity.start_date);
    const weekId = TIMEFRAMES[timeframe].getPeriodKey(date);
    weekMap[weekId] = (weekMap[weekId] ?? 0) + (activity.suffer_score ?? 0);

    return weekMap;
  }, {});

  const chartData = Object.entries(dataPerWeek)
    .slice(-displayedWeeks)
    .map(([weekId, effort]) => ({
      week: weekId,
      value: effort,
    }));

  const chart = useChart({
    data: chartData,
    series: [{name: 'value', color: 'orange.solid'}],
  });

  return (
    <Stat.Root {...rest}>
      <Chart.Root width="80%" height="57px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
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
              content={({payload}) => (payload && payload.length > 0 ? payload[0].value : null)}
              isAnimationActive={false}
            />
            {chart.series.map(item => (
              <Area
                key={item.name}
                activeDot={{stroke: chart.color('bg')}}
                isAnimationActive={false}
                dataKey={chart.key(item.name)}
                fill="url(#sp-gradient)"
                fillOpacity={0.2}
                stroke={chart.color(item.color)}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Chart.Root>
      <Stat.HelpText
        fontSize=".8em"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        paddingRight="25px"
      >
        {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} trend
        <span>
          <IconButton size="2xs" variant="ghost" onClick={handleExpandWeeks}>
            <LuPlus />
          </IconButton>
          <IconButton size="2xs" variant="ghost" onClick={handleShrinkWeeks}>
            <LuMinus />
          </IconButton>
        </span>
      </Stat.HelpText>
    </Stat.Root>
  );
};

export {SufferTrendChart};
