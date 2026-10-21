import {useMemo, useState} from 'react';
import {Box, Stack, Table, Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Link} from 'react-router';
import {useAllActivities, useSettings} from '../../hooks';
import {commuteRoutes} from '../../models';
import {km, number} from '../../app/format';
import {ChartTooltip} from './ChartTooltip';

const speed = (metresPerSecond: number, locale: string): string => `${number(metresPerSecond * 3.6, locale, 1)} km/h`;

/** Each commute route (rides with the same name) with its speeds, and what riding it saved. */
const CommuteRoutes = () => {
  const {data} = useAllActivities();
  const {locale, carCostPerKm} = useSettings();
  const routes = useMemo(() => commuteRoutes(data ?? []), [data]);
  const [picked, setPicked] = useState<string | null>(null);
  const route = routes.find(({name}) => name === picked) ?? routes[0];
  const commuteKm = (data ?? []).filter(({commute}) => commute).reduce((sum, {distance}) => sum + distance, 0) / 1000;
  const chart = useChart({
    data: (route?.rides ?? []).map(ride => ({...ride, kmh: Math.round(ride.speed * 36) / 10})),
    series: [{name: 'kmh', color: 'teal.solid'}],
  });

  if (undefined === route)
    return <Text color="fg.muted">Routes show up once a commute name comes back three times.</Text>;

  return (
    <Stack gap="16px">
      <Text>
        {number(commuteKm, locale)} km commuted by bike: about{' '}
        <Text as="span" fontWeight="semibold">
          {number(commuteKm * carCostPerKm, locale)} €
        </Text>{' '}
        not spent on a car, at {number(carCostPerKm, locale, 2)} € per km (set in Settings).
      </Text>
      <Box overflowX="auto">
        <Table.Root size="sm" interactive={true}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Route</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Rides</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Typical</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Best</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Last</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {routes.map(({name, count, distance, medianSpeed, bestSpeed, bestId, lastSpeed}) => (
              <Table.Row
                key={name}
                cursor="pointer"
                background={name === route.name ? 'bg.muted' : undefined}
                onClick={() => setPicked(name)}
                title={`${km(distance, locale)} in all`}
              >
                <Table.Cell>{name}</Table.Cell>
                <Table.Cell textAlign="end">{count}</Table.Cell>
                <Table.Cell textAlign="end" fontFamily="figure">
                  {speed(medianSpeed, locale)}
                </Table.Cell>
                <Table.Cell textAlign="end" fontFamily="figure">
                  <Link to={`/activities/${bestId}`} onClick={event => event.stopPropagation()}>
                    {speed(bestSpeed, locale)}
                  </Link>
                </Table.Cell>
                <Table.Cell
                  textAlign="end"
                  fontFamily="figure"
                  color={lastSpeed >= medianSpeed ? 'green.fg' : 'fg.muted'}
                >
                  {speed(lastSpeed, locale)}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
      <Text fontWeight="medium">{route.name}, ride by ride</Text>
      <Chart.Root width="100%" height="260px" chart={chart}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.data}>
            <XAxis
              dataKey="date"
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke={chart.color('fg.muted')}
              tickLine={false}
              tickFormatter={date => new Date(date).toLocaleDateString(locale, {month: 'short', year: '2-digit'})}
            />
            <YAxis
              stroke={chart.color('fg.muted')}
              width={48}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={value => `${value}`}
            />
            <ReferenceLine
              y={Math.round(route.medianSpeed * 36) / 10}
              stroke={chart.color('fg.muted')}
              strokeDasharray="5 4"
            />
            <Tooltip
              isAnimationActive={false}
              content={({payload, active}) => {
                const ride = payload?.[0]?.payload as {date: number; kmh: number} | undefined;
                return !active || undefined === ride ? null : (
                  <ChartTooltip>
                    {new Date(ride.date).toLocaleDateString(locale)} · {number(ride.kmh, locale, 1)} km/h
                  </ChartTooltip>
                );
              }}
            />
            <Line
              dataKey={chart.key('kmh')}
              stroke={chart.color('teal.solid')}
              strokeWidth={2}
              dot={{r: 2}}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Chart.Root>
    </Stack>
  );
};

export {CommuteRoutes};
