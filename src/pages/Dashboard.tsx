import {Fragment, ReactNode, useMemo} from 'react';
import {Box, Grid, Group, Heading, HStack, IconButton, Span, Spinner, Stack, Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {Link} from 'react-router';
import {MdArrowBack} from 'react-icons/md';
import {Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {ChartTooltip} from '../components/charts/ChartTooltip';
import {EditLabels, PageTitle} from '../components';
import {useActivities, useActivityMeta, useEvents, useExpenses, useFtp, useLabels} from '../hooks';
import {computeDashboard, Dashboard as DashboardData, formatCurrency, formatDistance, formatDuration} from '../models';

const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const count = (value: number): string => Math.round(value).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');

type PanelProps = {title: string; note?: string; children: ReactNode};

const Panel = ({title, note, children}: PanelProps) => (
  <Stack gap="10px" borderWidth="1px" borderColor="border" borderRadius="8px" padding="16px" minWidth="0">
    <HStack justifyContent="space-between" alignItems="baseline" gap="10px" flexWrap="wrap">
      <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.1em" color="fg.muted">
        {title}
      </Text>
      {undefined !== note && (
        <Text fontSize="xs" color="fg.muted">
          {note}
        </Text>
      )}
    </HStack>
    {children}
  </Stack>
);

type ReadoutProps = {value: string; unit?: string; caption: string};

const Readout = ({value, unit, caption}: ReadoutProps) => (
  <Stack gap="0" borderWidth="1px" borderColor="border" borderRadius="8px" padding="12px 14px" minWidth="0">
    <Text fontSize="2xl" fontWeight="semibold" lineHeight="1.15" truncate={true}>
      {value}
      {undefined !== unit && (
        <Span fontSize="sm" color="fg.muted" fontWeight="normal">
          {' '}
          {unit}
        </Span>
      )}
    </Text>
    <Text fontSize="xs" color="fg.muted">
      {caption}
    </Text>
  </Stack>
);

type BarsProps = {
  data: {name: string; value: number}[];
  format: (value: number) => string;
  layout?: 'vertical' | 'horizontal';
  height?: number;
  labelWidth?: number;
};

const Bars = ({data, format, layout = 'horizontal', height = 220, labelWidth = 92}: BarsProps) => {
  const chart = useChart({data, series: [{name: 'value', color: 'orange.solid'}]});
  const isVertical = 'vertical' === layout;

  const tooltip = (
    <Tooltip
      cursor={{fill: chart.color('bg.muted')}}
      isAnimationActive={false}
      content={({payload, active}) => {
        if (!active || !payload?.length) return null;

        const row = payload[0].payload as {name: string; value: number};

        return (
          <ChartTooltip>
            {row.name} · {format(row.value)}
          </ChartTooltip>
        );
      }}
    />
  );

  return (
    <Chart.Root width="100%" height={`${height}px`} chart={chart}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.data} layout={layout} margin={{top: 4, right: 12, bottom: 0, left: 0}}>
          {isVertical ? (
            <>
              <XAxis type="number" stroke={chart.color('fg.muted')} tickLine={false} tickFormatter={format} />
              <YAxis
                type="category"
                dataKey="name"
                width={labelWidth}
                stroke={chart.color('fg.muted')}
                tickLine={false}
                axisLine={false}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="name" stroke={chart.color('fg.muted')} tickLine={false} interval="preserveStartEnd" />
              <YAxis
                stroke={chart.color('fg.muted')}
                width={58}
                tickLine={false}
                axisLine={false}
                tickFormatter={format}
              />
            </>
          )}
          {tooltip}
          <Bar
            dataKey={chart.key('value')}
            fill={chart.color('orange.solid')}
            fillOpacity={0.55}
            radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </Chart.Root>
  );
};

const MonthHeatmap = ({months}: {months: DashboardData['months']}) => {
  const max = Math.max(...months.map(({distance}) => distance), 1);
  const years = [...new Set(months.map(({year}) => year))].sort();
  const lookup = new Map(months.map(month => [`${month.year}-${month.month}`, month.distance]));

  return (
    <Stack gap="8px">
      <Grid templateColumns="38px repeat(12, 1fr)" gap="3px" alignItems="center">
        <Box />
        {MONTH_INITIALS.map((initial, index) => (
          <Text key={index} fontSize="10px" color="fg.muted" textAlign="center">
            {initial}
          </Text>
        ))}
        {years.map(year => (
          <Fragment key={year}>
            <Text fontSize="10px" color="fg.muted">
              {year}
            </Text>
            {MONTH_INITIALS.map((_, index) => {
              const distance = lookup.get(`${year}-${index + 1}`) ?? 0;
              const intensity = 16 + Math.round((distance / max) * 84);

              return (
                <Box
                  key={`${year}-${index}`}
                  aspectRatio="1"
                  minHeight="14px"
                  borderRadius="3px"
                  background={
                    0 === distance
                      ? 'bg.muted'
                      : `color-mix(in oklab, var(--chakra-colors-orange-solid) ${intensity}%, var(--chakra-colors-bg-muted))`
                  }
                  title={`${MONTH_NAMES[index]} ${year} · ${formatDistance(distance)}`}
                />
              );
            })}
          </Fragment>
        ))}
      </Grid>
      <HStack gap="6px" fontSize="10px" color="fg.muted">
        <Text fontSize="10px">0</Text>
        {[0, 37, 58, 79, 100].map(step => (
          <Box
            key={step}
            width="16px"
            height="10px"
            borderRadius="2px"
            background={
              0 === step
                ? 'bg.muted'
                : `color-mix(in oklab, var(--chakra-colors-orange-solid) ${step}%, var(--chakra-colors-bg-muted))`
            }
          />
        ))}
        <Text fontSize="10px">{formatDistance(max)} in a month</Text>
      </HStack>
    </Stack>
  );
};

const FtpChart = ({ftp}: {ftp: DashboardData['ftp']}) => {
  const chart = useChart({data: ftp, series: [{name: 'power', color: 'orange.solid'}]});

  if (0 === ftp.length) return <Text fontSize="sm" color="fg.muted">No FTP test recorded yet.</Text>;

  return (
    <Chart.Root width="100%" height="200px" chart={chart}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chart.data} margin={{top: 8, right: 12, bottom: 0, left: 0}}>
          <XAxis dataKey="label" stroke={chart.color('fg.muted')} tickLine={false} />
          <YAxis
            stroke={chart.color('fg.muted')}
            width={54}
            domain={['dataMin - 15', 'dataMax + 10']}
            tickLine={false}
            axisLine={false}
            tickFormatter={value => `${value} W`}
          />
          <Tooltip
            cursor={{stroke: chart.color('fg.muted'), strokeWidth: 1}}
            isAnimationActive={false}
            content={({payload, active}) => {
              if (!active || !payload?.length) return null;

              const test = payload[0].payload as DashboardData['ftp'][number];

              return (
                <ChartTooltip>
                  <div>{test.date}</div>
                  <div>
                    {test.power} W · {test.wattsPerKilo} W/kg · {test.weight} kg
                  </div>
                </ChartTooltip>
              );
            }}
          />
          <Line
            dataKey={chart.key('power')}
            type="monotone"
            stroke={chart.color('orange.solid')}
            strokeWidth={2.5}
            dot={{r: 3}}
            activeDot={{r: 5}}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Chart.Root>
  );
};

const Records = ({records}: {records: DashboardData['records']}) => (
  <Grid templateColumns="repeat(auto-fit, minmax(230px, 1fr))" gap="12px">
    {records.map(({key, heading, unit, rides}) => (
      <Panel key={key} title={heading}>
        <Stack gap="8px">
          {0 === rides.length && (
            <Text fontSize="sm" color="fg.muted">
              Nothing recorded.
            </Text>
          )}
          {rides.map(ride => (
            <HStack key={`${key}-${ride.name}-${ride.date}`} justifyContent="space-between" gap="10px" alignItems="baseline">
              <Stack gap="0" minWidth="0">
                <Text fontSize="sm" lineClamp={1}>
                  {ride.name}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {ride.date}
                </Text>
              </Stack>
              <Text fontSize="sm" fontWeight="semibold" color="orange.solid" whiteSpace="nowrap">
                {count(ride.value)} {unit}
              </Text>
            </HStack>
          ))}
        </Stack>
      </Panel>
    ))}
  </Grid>
);

const Dashboard = () => {
  const {activities} = useActivities({withCommute: true, withPrivate: true, sort: 'date', sortDirection: 'asc'});
  const {activityMeta} = useActivityMeta();
  const {events} = useEvents();
  const {tests: ftpTests} = useFtp();
  const {expenses} = useExpenses();
  const {label} = useLabels();

  const data = useMemo(
    () => computeDashboard(activities ?? [], activityMeta, events, ftpTests, expenses, label),
    [activities, activityMeta, events, ftpTests, expenses, label],
  );

  if (null === activities) {
    return (
      <Group padding="40px" justifyContent="center" gap="10px">
        <IconButton asChild={true} title="Back to activities" variant="ghost" size="sm">
          <Link to="/">
            <MdArrowBack />
          </Link>
        </IconButton>
        <Spinner />
        <Text color="fg.muted">Loading the archive…</Text>
      </Group>
    );
  }

  const {totals, spending, npeloton, maintenance, conditions} = data;
  const metaCoverage = 0 === totals.rides ? 0 : Math.round((totals.metaCount / totals.rides) * 100);

  return (
    <Stack padding={{base: '16px', md: '24px'}} gap="28px" maxWidth="1200px" margin="0 auto">
      <PageTitle title="Statva dashboard 📊" />
      <HStack justifyContent="space-between" alignItems="center" gap="12px" flexWrap="wrap">
        <HStack gap="10px" alignItems="center">
          <IconButton asChild={true} title="Back to activities" variant="ghost" size="sm">
            <Link to="/">
              <MdArrowBack />
            </Link>
          </IconButton>
          <Stack gap="2px">
            <Heading size="lg">Ride ledger 📊</Heading>
            <Text fontSize="sm" color="fg.muted">
              {count(totals.rides)} activities from {totals.firstDate} to {totals.lastDate}. Details cached for{' '}
              {count(totals.metaCount)} of them ({metaCoverage}%).
            </Text>
          </Stack>
        </HStack>
        <EditLabels />
      </HStack>

      <Grid templateColumns="repeat(auto-fit, minmax(140px, 1fr))" gap="10px">
        <Readout value={formatDistance(totals.distance)} caption="ridden" />
        <Readout value={formatDuration(totals.movingTime, true)} caption="in the saddle" />
        <Readout value={count(totals.elevation)} unit="m" caption="climbed" />
        <Readout value={count(totals.rides)} caption="activities" />
        <Readout value={count(totals.calories / 1000)} unit="k kcal" caption="burned" />
        <Readout value={count(totals.kudos)} caption="kudos received" />
      </Grid>

      <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap="16px">
        <Panel title="Distance per year">
          <Bars
            data={data.years.map(({year, distance}) => ({name: String(year), value: distance}))}
            format={value => formatDistance(value)}
          />
        </Panel>
        <Panel title="Climbing per year" note="metres gained">
          <Bars
            data={data.years.map(({year, elevation}) => ({name: String(year), value: elevation}))}
            format={value => `${count(value)} m`}
          />
        </Panel>
      </Grid>

      <Panel title="Month by month" note="darkest is the biggest month">
        <MonthHeatmap months={data.months} />
      </Panel>

      <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap="16px">
        <Panel title="The fleet" note={data.sports.map(({type, rides}) => `${type} ${rides}`).join(' · ')}>
          <Bars
            data={data.gear.map(({name, distance}) => ({name, value: distance}))}
            format={value => formatDistance(value)}
            layout="vertical"
            height={Math.max(160, data.gear.length * 34)}
          />
        </Panel>
        <Panel title="Threshold power" note={`${data.ftp.length} tests`}>
          <FtpChart ftp={data.ftp} />
        </Panel>
      </Grid>

      <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap="16px">
        <Panel title="Start hour" note="local time">
          <Bars data={data.startHours} format={value => `${count(value)} rides`} height={190} />
        </Panel>
        <Panel title="Weekday">
          <Bars data={data.weekdays} format={value => `${count(value)} rides`} height={190} />
        </Panel>
      </Grid>

      <Stack gap="10px">
        <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.1em" color="fg.muted">
          Hall of fame
        </Text>
        <Records records={data.records} />
      </Stack>

      <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap="16px">
        <Panel
          title="N-Peloton groups"
          note={`${count(npeloton.rides)} sessions · ${formatDistance(npeloton.distance)}`}
        >
          <Bars
            data={npeloton.groups}
            format={value => `${count(value)} sessions`}
            layout="vertical"
            height={Math.max(160, npeloton.groups.length * 30)}
            labelWidth={70}
          />
        </Panel>
        <Panel title="Where it finished" note="from ride notes">
          <Bars
            data={npeloton.finishes}
            format={value => `${count(value)} visits`}
            layout="vertical"
            height={Math.max(160, npeloton.finishes.length * 30)}
            labelWidth={128}
          />
        </Panel>
      </Grid>

      <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap="16px">
        <Panel title="Maintenance" note={`${count(maintenance.total)} events`}>
          <Bars
            data={maintenance.byType}
            format={value => `${count(value)} times`}
            layout="vertical"
            height={Math.max(160, maintenance.byType.length * 30)}
            labelWidth={54}
          />
        </Panel>
        <Panel title="Running costs">
          <Stack gap="0">
            {[
              ['Parts and kit logged', `${count(spending.count)} entries`],
              ['Total spend', formatCurrency(spending.total * 100)],
              ['Cost per kilometre', null === spending.centsPerKm ? '—' : `${spending.centsPerKm.toFixed(1)} c/km`],
              ['Personal records', count(totals.prs)],
              ['Segment wins', count(totals.koms)],
              ['Photos taken', count(totals.photos)],
            ].map(([key, value]) => (
              <HStack key={key} justifyContent="space-between" paddingY="6px" borderBottomWidth="1px" borderColor="border.subtle">
                <Text fontSize="sm" color="fg.muted">
                  {key}
                </Text>
                <Text fontSize="sm">{value}</Text>
              </HStack>
            ))}
          </Stack>
        </Panel>
      </Grid>

      <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap="16px">
        <Panel title="Temperature" note="from cached ride details">
          <Bars data={conditions.temperatures} format={value => `${count(value)} rides`} height={190} />
        </Panel>
        <Panel title="Recording device">
          <Bars
            data={conditions.devices}
            format={value => `${count(value)} rides`}
            layout="vertical"
            height={Math.max(160, conditions.devices.length * 30)}
            labelWidth={128}
          />
        </Panel>
      </Grid>

      <Text fontSize="xs" color="fg.muted">
        Totals come from every Strava activity. Calories, temperature, devices, segment wins and the finish list come
        from the ride details cached in Redis, currently {metaCoverage}% of rides. Run{' '}
        <Span fontFamily="mono">node scripts/backfill-activities.mjs</Span> to fill the rest.
      </Text>
    </Stack>
  );
};

export {Dashboard};
