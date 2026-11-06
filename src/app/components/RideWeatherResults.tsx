import {ReactNode, useEffect, useId, useMemo, useState} from 'react';
import {Box, Grid, HStack, Link as ChakraLink, Spinner, Stack, Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {useQuery} from '@tanstack/react-query';
import {divIcon} from 'leaflet';
import {CircleMarker, Marker, Polyline, Tooltip as MapTooltip} from 'react-leaflet';
import {LuArrowUp, LuExternalLink} from 'react-icons/lu';
import {SiKomoot, SiStrava} from 'react-icons/si';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  MouseHandlerDataParam,
  ReferenceLine,
  ResponsiveContainer,
  TickItem,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {AxisDomain} from 'recharts/types/util/types';
import {getFetcher} from '../../hooks/useFetcher';
import {
  betterStart,
  climbing,
  elevationProfile,
  FORECAST_DAYS,
  gradeAlong,
  haversine,
  HourForecast,
  isLoop,
  NOTICEABLE_WIND,
  outfit,
  Pace,
  PlannedRoute,
  rainSpell,
  rideSky,
  RoutePoint,
  sampleIndexes,
  START_SHIFTS,
  startOptions,
  sunTimes,
  timeline,
  WeatherPoint,
  weatherAlong,
  weatherReversed,
  windCost,
  windShares,
} from '../../models';
import {deviceDay} from '../../models/local-day';
import {ChartTooltip} from '../../components/charts/ChartTooltip';
import {Card, CardTitle} from './Card';
import {DaylightBar} from './DaylightBar';
import {ARROW_COLORS, arrowLength, arrowPath, WIND_COLORS} from './ride-weather-colors';
import {WeatherRow} from './WeatherRow';
import {TrackMap} from './TrackMap';
import {duration, km, metres, number} from '../format';

const fetchForecasts = getFetcher<HourForecast[][]>('weather.forecast');
const fetchPlaceNames = getFetcher<(string | null)[]>('place.names');

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
// About this many wind arrows and distance marks on the map, whatever the route's length.
const ARROWS = 10;
const KM_STEPS = [5, 10, 20, 25, 50, 100];
// The slope uphill (%) from which each colour starts: flat and downhill grey, then warmer.
const SLOPE_COLORS: [number, string, string][] = [
  [-Infinity, '#8b8d98', 'under 3 %'],
  [3, '#f5c451', '3 %'],
  [6, '#f08c3a', '6 %'],
  [9, '#e5484d', '9 %'],
  [12, '#a5232a', '12 %+'],
];

// How hard it rains, as heights on the 0 to 100 of the rain chart: [mm per hour, height].
const RAIN_STEPS: [number, number][] = [
  [0, 0],
  [0.5, 20],
  [2, 40],
  [5, 60],
  [10, 80],
  [20, 100],
];
// The words on the right of the rain chart, in the middle of each step.
const RAIN_LABELS = [
  {value: 10, label: 'Very light'},
  {value: 30, label: 'Light'},
  {value: 50, label: 'Moderate'},
  {value: 70, label: 'Heavy'},
  {value: 90, label: 'Very heavy'},
];

/** The height of a rain (mm/h) on the rain chart, between the steps around it. */
const rainLevel = (rain: number): number => {
  const upper = RAIN_STEPS.findIndex(([amount]) => rain <= amount);
  if (-1 === upper) return 100;
  if (0 === upper) return 0;
  const [[low, lowHeight], [high, highHeight]] = [RAIN_STEPS[upper - 1], RAIN_STEPS[upper]];

  return lowHeight + ((rain - low) / (high - low)) * (highHeight - lowHeight);
};

const slopeColor = (grade: number): string =>
  SLOPE_COLORS.reduce((color, [from, next]) => (grade >= from ? next : color), SLOPE_COLORS[0][1]);

/** The elevation's colour along the chart: hard stops where the slope changes class. */
const slopeStops = (profile: {time: number; grade: number}[]): [number, string][] => {
  const [first, last] = [profile[0]?.time ?? 0, profile.at(-1)?.time ?? 0];
  if (last <= first) return [];
  const stops: [number, string][] = [[0, slopeColor(profile[0].grade)]];
  profile.slice(1, -1).forEach(point => {
    const color = slopeColor(point.grade);
    const before = stops[stops.length - 1][1];
    if (color === before) return;
    const offset = (point.time - first) / (last - first);
    stops.push([offset, before], [offset, color]);
  });
  stops.push([1, stops[stops.length - 1][1]]);

  return stops;
};

const compass = (degrees: number): string => COMPASS[Math.round(degrees / 45) % 8];
const windColor = (headwind: number, colors = WIND_COLORS): string =>
  NOTICEABLE_WIND < headwind ? colors.head : headwind < -NOTICEABLE_WIND ? colors.tail : colors.calm;
const minutes = (seconds: number): number => Math.round(Math.abs(seconds) / 60);
const clock = (time: number, locale: string) =>
  new Date(time).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'});
const range = (values: number[], locale: string) =>
  `${number(Math.min(...values), locale)} to ${number(Math.max(...values), locale)}`;

/**
 * Where the wind blows at a forecast point: a slim arrow pointing the way it goes, coloured by
 * what it does to the rider, sized by its strength, its speed underneath.
 */
const WindArrow = ({point, locale}: {point: WeatherPoint; locale: string}) => {
  // 2.4 px per km/h, head and all: 10 km/h is 24 px long, 30 km/h 72 px; from 16 px, capped at 96.
  const length = arrowLength(point.wind, 2.4, 16, 96);
  const icon = divIcon({
    className: '',
    iconSize: [length, length + 14],
    iconAnchor: [length / 2, length / 2],
    // The arrow sits in a square as wide as it is long, turned about its middle.
    html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6))">
      <svg width="${length}" height="${length}" viewBox="0 0 ${length} ${length}" style="transform:rotate(${point.windFrom + 180}deg)">
        <path d="${arrowPath(length)}" fill="${windColor(point.headwind, ARROW_COLORS)}"/>
      </svg>
      <span style="font:700 11px/1 system-ui,sans-serif;color:white;margin-top:1px;text-shadow:0 0 3px #000,0 0 2px #000">${Math.round(point.wind)}</span>
    </div>`,
  });
  const effect =
    NOTICEABLE_WIND < point.headwind
      ? `headwind ${number(point.headwind, locale)} km/h`
      : point.headwind < -NOTICEABLE_WIND
        ? `tailwind ${number(-point.headwind, locale)} km/h`
        : 'crosswind';

  return (
    <Marker position={[point.lat, point.lng]} icon={icon}>
      <MapTooltip>
        {km(point.distance, locale)} at {clock(point.time, locale)}: {number(point.wind, locale)} km/h from{' '}
        {compass(point.windFrom)} (gusts {number(point.gust, locale)}), {effect}
      </MapTooltip>
    </Marker>
  );
};

type DistanceMarkAt = {distance: number; point: RoutePoint; time: number};

/** The distance along the route every few km, with the time the rider gets there. */
const distanceMarks = (points: RoutePoint[], times: number[], start: number): DistanceMarkAt[] => {
  const total = points.at(-1)?.distance ?? 0;
  const step = (KM_STEPS.find(candidate => total / (candidate * 1000) <= ARROWS) ?? 100) * 1000;
  const marks: DistanceMarkAt[] = [];

  for (let distance = step; distance < total - step / 3; distance += step) {
    const index = points.findIndex(({distance: along}) => along >= distance);
    if (-1 !== index) marks.push({distance, point: points[index], time: start + times[index] * 1000});
  }

  return marks;
};

const DistanceMark = ({distance, point, time, locale}: DistanceMarkAt & {locale: string}) => (
  <Marker
    position={[point.lat, point.lng]}
    interactive={false}
    icon={divIcon({
      className: '',
      iconSize: [92, 18],
      iconAnchor: [102, 9],
      html: `<span style="float:right;color:white;font:600 11px/1.2 system-ui,sans-serif;white-space:nowrap;text-shadow:0 0 3px #000,0 0 2px #000">${distance / 1000} km · ${clock(time, locale)}</span>`,
    })}
  />
);

// A point of a chart: a moment of the ride, where the rider is then.
type ChartPoint = {time: number; distance: number; lat: number; lng: number};
type Place = {lat: number; lng: number};
type Series<Point> = {
  name: keyof Point & string;
  label: string;
  color: string;
  kind: 'line' | 'area' | 'bar';
  dashed?: boolean;
  // An area coloured along the way: [share of the width, colour] from left to right.
  stops?: [number, string][];
  // The value as the tooltip shows it, when it is not the plotted number and the unit.
  format?: (point: Point) => string;
};

/**
 * The charts have different points (the forecast every few km, the elevation all along), so
 * the pointer over one shows, on the others, their point closest in time.
 */
const closestInTime = (ticks: ReadonlyArray<TickItem>, {activeLabel}: MouseHandlerDataParam): number => {
  let closest = 0;
  ticks.forEach((tick, index) => {
    if (
      Math.abs(Number(tick.value) - Number(activeLabel)) < Math.abs(Number(ticks[closest].value) - Number(activeLabel))
    )
      closest = index;
  });

  return closest;
};

/** One measure along the ride, against the time of day, with the km in the tooltip. */
const WeatherChart = <Point extends ChartPoint>({
  data,
  series,
  unit,
  locale,
  zeroLine = false,
  yDomain,
  tooltipExtra,
  rightLabels,
  onHover,
}: {
  data: Point[];
  series: Series<Point>[];
  unit: string;
  locale: string;
  zeroLine?: boolean;
  yDomain?: AxisDomain;
  // A line added under the values in the tooltip.
  tooltipExtra?: (point: Point) => string | null;
  // Words on the right-hand side, on the same scale as the left: no second scale.
  rightLabels?: {value: number; label: string}[];
  // Where the rider is at the point under the pointer, or null once it leaves, for the map.
  onHover: (place: Place | null) => void;
}) => {
  const chart = useChart({
    data,
    series: series.map(({name, label, color}) => ({name, label, color})),
  });
  const gradient = useId();

  return (
    <Chart.Root width="100%" height="220px" chart={chart}>
      <ResponsiveContainer width="100%" height="100%">
        {/* The charts share a syncId, so the pointer over one shows the same moment on all. */}
        <ComposedChart
          data={chart.data}
          // Room on the right for the words, when there are some.
          margin={undefined === rightLabels ? undefined : {right: 78, top: 5}}
          syncId="ride-weather"
          syncMethod={closestInTime}
          onMouseMove={({activeTooltipIndex}) =>
            onHover(undefined === activeTooltipIndex ? null : (data[Number(activeTooltipIndex)] ?? null))
          }
          onMouseLeave={() => onHover(null)}
        >
          {/* A quiet grid, both ways, to read the values and times off. */}
          <CartesianGrid stroke={chart.color('border.emphasized')} strokeOpacity={0.6} />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            stroke={chart.color('fg.muted')}
            tickLine={false}
            tickFormatter={time => clock(time, locale)}
          />
          <YAxis
            stroke={chart.color('fg.muted')}
            width={2 < unit.length ? 70 : 44}
            tickLine={false}
            axisLine={false}
            unit={unit}
            domain={yDomain}
          />
          {rightLabels?.map(({value, label}) => (
            <ReferenceLine
              key={value}
              y={value}
              stroke="none"
              label={{value: label, position: 'right', fill: chart.color('fg.muted'), fontSize: 12}}
            />
          ))}
          {zeroLine && <ReferenceLine y={0} stroke={chart.color('border')} />}
          {1 < series.length && <Legend content={<Chart.Legend />} />}
          <Tooltip
            isAnimationActive={false}
            content={({payload, active}) =>
              !active || !payload?.length ? null : (
                <ChartTooltip>
                  {clock((payload[0].payload as Point).time, locale)} ·{' '}
                  {km((payload[0].payload as Point).distance, locale)}
                  {series.map(({name, label, format}) => (
                    <div key={name}>
                      {label}:{' '}
                      {undefined === format
                        ? `${number(Number((payload[0].payload as Point)[name]), locale)}${unit}`
                        : format(payload[0].payload as Point)}
                    </div>
                  ))}
                  {tooltipExtra?.(payload[0].payload as Point)}
                </ChartTooltip>
              )
            }
          />
          <defs>
            {series.map(({name, stops}) =>
              undefined === stops ? null : (
                <linearGradient key={name} id={`${gradient}-${name}`} x1="0" y1="0" x2="1" y2="0">
                  {stops.map(([offset, stopColor], index) => (
                    <stop key={index} offset={offset} stopColor={stopColor} />
                  ))}
                </linearGradient>
              ),
            )}
          </defs>
          {series.map(({name, color, kind, dashed, stops}) =>
            'bar' === kind ? (
              <Bar
                key={name}
                dataKey={String(name)}
                fill={chart.color(color)}
                maxBarSize={14}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            ) : 'area' === kind && undefined !== stops ? (
              <Area
                key={name}
                dataKey={String(name)}
                type="monotone"
                stroke={`url(#${gradient}-${name})`}
                fill={`url(#${gradient}-${name})`}
                fillOpacity={0.35}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ) : 'area' === kind ? (
              <Area
                key={name}
                dataKey={String(name)}
                type="monotone"
                stroke={chart.color(color)}
                fill={chart.color(color)}
                fillOpacity={0.2}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={name}
                dataKey={String(name)}
                type="monotone"
                stroke={chart.color(color)}
                strokeWidth={2}
                strokeDasharray={dashed ? '4 3' : undefined}
                dot={false}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Chart.Root>
  );
};

/** One figure of the ride: a small label over its value, with a detail under it. */
const Field = ({label, value, detail}: {label: string; value: ReactNode; detail?: string}) => (
  <Stack gap="2px" minWidth="0">
    <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
      {label}
    </Text>
    <Text fontFamily="figure" fontSize="lg" fontWeight="semibold" lineHeight="1.2">
      {value}
    </Text>
    {undefined !== detail && (
      <Text fontSize="xs" color="fg.muted">
        {detail}
      </Text>
    )}
  </Stack>
);

type RideWeatherResultsProps = {
  route: PlannedRoute;
  start: number;
  pace: Pace;
  locale: string;
  // Stops along the way (s), spread evenly: the rider gets to each point later.
  stops: number;
  // Hears the ride's weather as one emoji once the forecast is in (null before).
  onSky?: (emoji: string | null) => void;
};

/**
 * The weather on a planned ride: when the rider reaches each part of the route at their pace,
 * the forecast there and then, as figures, a map with the wind and charts. Shared by the
 * rider's own page and the page a shared link opens.
 */
const RideWeatherResults = ({route, start, pace, locale, stops, onSky}: RideWeatherResultsProps) => {
  const {points} = route;
  const distance = points.at(-1)?.distance ?? 0;
  const climb = useMemo(() => climbing(points), [points]);
  const riding = useMemo(() => timeline(points, pace), [points, pace]);
  const moving = riding.at(-1) ?? 0;
  // The clock time over the riding time: stops spread along the way push every point later.
  const stretch = 0 < moving ? (moving + stops) / moving : 1;
  const times = useMemo(() => riding.map(seconds => seconds * stretch), [riding, stretch]);
  const finish = start + (moving + stops) * 1000;
  const indexes = useMemo(() => sampleIndexes(points), [points]);
  const [now] = useState(() => Date.now());
  const tooFar = start > now + (FORECAST_DAYS - 1) * DAY_MS;
  const marks = useMemo(() => distanceMarks(points, times, start), [points, times, start]);

  const earliest = start + Math.min(...START_SHIFTS) * HOUR_MS;
  const latest = finish + Math.max(...START_SHIFTS) * HOUR_MS;
  const forecasts = useQuery({
    // Asked again only when the places or the days change, not for every minute of the start.
    // Wide enough for the best start, a few hours either side.
    queryKey: ['forecast', route.name, indexes.join(','), deviceDay(new Date(earliest)), deviceDay(new Date(latest))],
    queryFn: () =>
      fetchForecasts(
        indexes.map(index => points[index]),
        earliest,
        latest,
      ),
    enabled: 0 < indexes.length && !tooFar && !Number.isNaN(start),
    staleTime: 15 * 60000,
    retry: false,
  });
  const weather = useMemo(
    () => (forecasts.data ? weatherAlong(points, times, start, indexes, forecasts.data) : []),
    [forecasts.data, points, times, start, indexes],
  );
  const shares = windShares(weather);
  // The forecast point the pointer is on in a chart, marked on the map.
  const [hovered, setHovered] = useState<Place | null>(null);
  const profile = useMemo(() => {
    const grades = gradeAlong(points);
    return elevationProfile(
      points.map((point, index) => ({...point, grade: grades[index] * 100})),
      times,
      start,
    );
  }, [points, times, start]);
  const sky = useMemo(() => rideSky(weather), [weather]);
  useEffect(() => onSky?.(sky?.emoji ?? null), [sky, onSky]);
  const rainWeather = useMemo(() => weather.map(point => ({...point, rainLevel: rainLevel(point.rain)})), [weather]);
  const advice = useMemo(() => {
    if (!forecasts.data || 0 === weather.length) return null;
    const cost = windCost(weather, 1 / stretch);
    const loop = isLoop(points);

    return {
      cost,
      better: betterStart(startOptions(points, times, start, indexes, forecasts.data, 1 / stretch), start),
      reversedCost: loop
        ? windCost(weatherReversed(points, pace, start, indexes, forecasts.data, stretch), 1 / stretch)
        : null,
      spell: rainSpell(weather),
      wear: outfit(weather),
    };
  }, [forecasts.data, weather, points, times, start, indexes, pace, stretch]);
  const when = new Date(start).toLocaleString(locale, {weekday: 'long', day: 'numeric', month: 'long'});
  const ends = [points[0], points[points.length - 1]];
  const placeNames = useQuery({
    queryKey: ['placeNames', locale, ...ends.map(({lat, lng}) => `${lat.toFixed(3)},${lng.toFixed(3)}`)],
    queryFn: () => fetchPlaceNames(ends, locale),
    staleTime: Infinity,
    retry: false,
  });
  const [from, to] = placeNames.data ?? [null, null];
  // "Nantes → Clisson", or "From and back to Nantes" for a ride that ends where it starts.
  const where =
    null === from || null === to
      ? null
      : isLoop(points) || from === to
        ? `From and back to ${from}`
        : `${from} → ${to}`;
  const has = 0 < weather.length;
  const sun = useMemo(() => sunTimes(start, [points[0].lat, points[0].lng]), [start, points]);
  const average = (key: keyof WeatherPoint) =>
    weather.reduce((sum, point) => sum + Number(point[key]), 0) / weather.length;
  // The wind's usual direction over the ride, averaged as vectors so north is not torn in two.
  const windFrom =
    (Math.atan2(
      weather.reduce((sum, {windFrom: from}) => sum + Math.sin((from * Math.PI) / 180), 0),
      weather.reduce((sum, {windFrom: from}) => sum + Math.cos((from * Math.PI) / 180), 0),
    ) *
      180) /
      Math.PI +
    360;

  return (
    <Stack gap={{base: '16px', md: '24px'}}>
      {/* The ride: its name, where and when, and the advice once the forecast is in. */}
      <Card>
        <HStack justifyContent="space-between" alignItems="baseline" gap="12px" flexWrap="wrap">
          <Text fontFamily="heading" fontWeight="semibold" fontSize="lg">
            {route.name}
          </Text>
          {undefined !== route.source && (
            <ChakraLink href={route.source.url} target="_blank" rel="noreferrer" fontSize="sm" color="fg.muted">
              {'strava' === route.source.service ? <SiStrava color="#fc4c02" /> : <SiKomoot color="#6aa127" />}
              From {'strava' === route.source.service ? 'Strava' : 'Komoot'} <LuExternalLink />
            </ChakraLink>
          )}
        </HStack>
        <Text color="fg.muted" marginBottom="16px">
          {null !== where && `${where} · `}
          {when}, {clock(start, locale)} to {clock(finish, locale)}
        </Text>
        {null !== advice && (
          <Grid templateColumns={{base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)'}} gap="16px">
            {null !== sky && (
              <Stack gap="2px">
                <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
                  Weather
                </Text>
                <Text fontSize="5xl" lineHeight="1" role="img" aria-label={sky.label}>
                  {sky.emoji}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {sky.label}
                </Text>
              </Stack>
            )}
            <Field
              label="Wind"
              value={
                Math.abs(advice.cost) < 60
                  ? 'No real cost'
                  : `${0 < advice.cost ? '+' : '−'}${minutes(advice.cost)} min`
              }
              detail={
                Math.abs(advice.cost) < 60
                  ? 'the wind barely changes your time'
                  : `${0 < advice.cost ? 'lost to' : 'gained from'} the wind, at the same effort`
              }
            />
            <Field
              label="Best start"
              value={null === advice.better ? clock(start, locale) : clock(advice.better.start, locale)}
              detail={
                null === advice.better
                  ? 'yours: nothing better 3 h either side'
                  : advice.better.rainChance + 20 <= Math.max(...weather.map(({rainChance}) => rainChance))
                    ? `drier: ${number(advice.better.rainChance, locale)} % chance of rain at most`
                    : `${minutes(advice.cost - advice.better.windCost)} min quicker with the wind then`
              }
            />
            {null !== advice.reversedCost && (
              <Field
                label="The other way round"
                value={
                  advice.reversedCost < advice.cost - 60
                    ? `${minutes(advice.cost - advice.reversedCost)} min better`
                    : advice.reversedCost > advice.cost + 60
                      ? `${minutes(advice.reversedCost - advice.cost)} min worse`
                      : 'About the same'
                }
                detail="for the wind, on this loop"
              />
            )}
            {null !== sun && (
              <Stack gap="0">
                <Field
                  label="Daylight"
                  value={finish > sun.set ? `Dark from ${clock(sun.set, locale)}` : `Sunset ${clock(sun.set, locale)}`}
                  detail={
                    start < sun.rise
                      ? `starts before sunrise (${clock(sun.rise, locale)}): lights on`
                      : finish > sun.set
                        ? `the last ${minutes((finish - sun.set) / 1000)} min in the dark: lights on`
                        : `you finish ${duration((sun.set - finish) / 1000)} before it`
                  }
                />
                <DaylightBar start={start} finish={finish} sun={sun} clock={time => clock(time, locale)} />
              </Stack>
            )}
            <Field
              label="Rain on the way"
              value={null === advice.spell ? 'Dry' : `From km ${number(advice.spell.from.distance / 1000, locale)}`}
              detail={
                null === advice.spell
                  ? 'under 40 % chance all the way'
                  : `${clock(advice.spell.from.time, locale)} to ${clock(advice.spell.to.time, locale)}, until km ${number(advice.spell.to.distance / 1000, locale)}`
              }
            />
            <Field label="What to wear" value={advice.wear} />
          </Grid>
        )}
      </Card>

      {/* The map up front, beside the ride's figures on a wide screen, under them on a phone. */}
      <Grid
        templateColumns={{base: 'minmax(0, 1fr)', lg: 'minmax(0, 3fr) minmax(0, 2fr)'}}
        gap="16px"
        alignItems="start"
      >
        <Stack gap="8px">
          <TrackMap
            tracks={[points.map(({lat, lng}) => [lat, lng])]}
            center={[points[0].lat, points[0].lng]}
            height={{base: '340px', md: '500px', lg: '600px'}}
          >
            {/* The route between forecast points, coloured by the wind at the first. */}
            {weather.slice(0, -1).map((point, sample) => (
              <Polyline
                key={`wind-${point.distance}`}
                positions={points
                  .filter(({distance: along}) => point.distance <= along && along <= weather[sample + 1].distance)
                  .map(({lat, lng}) => [lat, lng])}
                pathOptions={{color: windColor(point.headwind), weight: 6, opacity: 0.9}}
              />
            ))}
            {null !== hovered && (
              <CircleMarker
                center={[hovered.lat, hovered.lng]}
                radius={8}
                pathOptions={{color: 'white', weight: 3, fillColor: '#f25c14', fillOpacity: 1}}
              />
            )}
            {marks.map(mark => (
              <DistanceMark key={mark.distance} {...mark} locale={locale} />
            ))}
            {weather
              .filter((_, sample) => 0 === sample % Math.max(1, Math.round(weather.length / ARROWS)))
              .map(point => (
                <WindArrow key={point.distance} point={point} locale={locale} />
              ))}
          </TrackMap>
        </Stack>
        <Card>
          {/* Two rows of four at most, so each figure has room on one line. */}
          <Grid
            templateColumns={{base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(2, 1fr)'}}
            columnGap="24px"
            rowGap="20px"
          >
            <Field
              label="Distance"
              value={km(distance, locale)}
              detail={
                isLoop(points) ? 'a loop' : `ends ${km(haversine(points[0], points[points.length - 1]), locale)} away`
              }
            />
            <Field
              label="Elevation"
              value={`${metres(climb, locale)} ↑`}
              detail={`${number(climb / (distance / 1000), locale)} m per km · top ${metres(Math.max(...points.map(({altitude}) => altitude)), locale)}`}
            />
            <Field
              label="Moving time"
              value={duration(moving)}
              detail={`${0 < stops ? `+ ${duration(stops)} of stops · ` : ''}finish at ${clock(finish, locale)}`}
            />
            <Field
              label="Average speed"
              value={`${number((distance / moving) * 3.6, locale, 1)} km/h`}
              detail="slower on the climbs"
            />
            <Field
              label="Temperature"
              value={
                has
                  ? `${range(
                      weather.map(({temperature}) => temperature),
                      locale,
                    )} °C`
                  : '…'
              }
              detail={
                has
                  ? `feels like ${range(
                      weather.map(({feelsLike}) => feelsLike),
                      locale,
                    )} °C`
                  : undefined
              }
            />
            <Field
              label="Rain"
              value={has ? `${number(Math.max(...weather.map(({rainChance}) => rainChance)), locale)} % at most` : '…'}
              detail={
                has
                  ? `${number(Math.max(...weather.map(({rain}) => rain)), locale, 1)} mm/h at most · ${number(average('cloud'), locale)} % clouds`
                  : undefined
              }
            />
            <Field
              label="Wind"
              value={
                has ? (
                  <HStack as="span" gap="6px" whiteSpace="nowrap">
                    {number(average('wind'), locale)} km/h from {compass(windFrom % 360)}
                    {/* Pointing the way it blows, as on the map. */}
                    <LuArrowUp
                      aria-hidden="true"
                      style={{transform: `rotate(${(windFrom + 180) % 360}deg)`}}
                      strokeWidth={2.5}
                    />
                  </HStack>
                ) : (
                  '…'
                )
              }
              detail={
                has ? `gusts up to ${number(Math.max(...weather.map(({gust}) => gust)), locale)} km/h` : undefined
              }
            />
            <Field
              label="Head / tail wind"
              value={has ? `${number(shares.head * 100, locale)} % / ${number(shares.tail * 100, locale)} %` : '…'}
              detail="of the route"
            />
          </Grid>
          {has && (
            <Box marginTop="16px" paddingTop="12px" borderTopWidth="1px">
              <WeatherRow
                weather={weather}
                start={start}
                finish={finish}
                sun={sun}
                clock={time => clock(time, locale)}
              />
            </Box>
          )}
        </Card>
      </Grid>

      {tooFar && <Text color="fg.muted">The forecast goes {FORECAST_DAYS} days ahead: pick an earlier day.</Text>}
      {forecasts.isError && (
        <Text color="fg.error">No forecast for now: {forecasts.error.message || 'try again'}.</Text>
      )}

      {has && (
        <Grid templateColumns={{base: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))'}} gap="16px">
          <Card>
            <CardTitle>Temperature</CardTitle>
            <WeatherChart
              data={weather}
              onHover={setHovered}
              unit="°"
              locale={locale}
              series={[
                {name: 'temperature', label: 'Temperature', color: 'orange.solid', kind: 'line'},
                {name: 'feelsLike', label: 'Feels like', color: 'orange.solid', kind: 'line', dashed: true},
              ]}
            />
          </Card>
          <Card>
            <CardTitle>Rain and clouds</CardTitle>
            {/* The chance and the clouds in %, and how hard it rains as bars, read in words on the right. */}
            <WeatherChart
              data={rainWeather}
              onHover={setHovered}
              unit="%"
              locale={locale}
              yDomain={[0, 100]}
              rightLabels={RAIN_LABELS}
              series={[
                {name: 'rainChance', label: 'Chance of rain', color: 'blue.solid', kind: 'area'},
                {
                  name: 'rainLevel',
                  label: 'Rain',
                  color: 'cyan.solid',
                  kind: 'bar',
                  format: ({rain}) => `${number(rain, locale, 1)} mm/h`,
                },
                {name: 'cloud', label: 'Cloud cover', color: 'gray.solid', kind: 'line'},
              ]}
            />
          </Card>
          <Card>
            <CardTitle>Wind</CardTitle>
            <WeatherChart
              data={weather}
              onHover={setHovered}
              unit=" km/h"
              locale={locale}
              zeroLine={true}
              series={[
                {name: 'wind', label: 'Wind', color: 'teal.solid', kind: 'line'},
                {name: 'gust', label: 'Gusts', color: 'teal.solid', kind: 'line', dashed: true},
                {name: 'headwind', label: 'Against you', color: 'red.solid', kind: 'area'},
              ]}
            />
          </Card>
          <Card>
            <CardTitle>Elevation</CardTitle>
            {/* Drawn from the route itself, not the forecast points, and scaled to its own heights. */}
            <WeatherChart
              data={profile}
              onHover={setHovered}
              unit=" m"
              locale={locale}
              yDomain={[
                (lowest: number) => Math.floor(lowest / 20) * 20,
                (highest: number) => Math.ceil(highest / 20) * 20,
              ]}
              tooltipExtra={({grade}) => `${number(grade, locale, 1)} % slope`}
              series={[
                {name: 'altitude', label: 'Altitude', color: 'gray.solid', kind: 'area', stops: slopeStops(profile)},
              ]}
            />
            <HStack justifyContent="center" gap="12px" fontSize="xs" color="fg.muted" flexWrap="wrap">
              {SLOPE_COLORS.map(([from, color, label]) => (
                <HStack key={from} gap="5px">
                  <Box width="10px" height="10px" borderRadius="2px" background={color} />
                  {label}
                </HStack>
              ))}
            </HStack>
          </Card>
        </Grid>
      )}
      {forecasts.isFetching && <Spinner alignSelf="center" />}
      <Text fontSize="xs" color="fg.muted">
        Forecast by Open-Meteo, read about every 4 km at the time the rider gets there. Made with Statva.
      </Text>
    </Stack>
  );
};

export {RideWeatherResults};
