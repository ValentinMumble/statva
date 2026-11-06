import {useMemo, useState} from 'react';
import {Grid, HStack, Link as ChakraLink, Spinner, Stack, Text} from '@chakra-ui/react';
import {Chart, useChart} from '@chakra-ui/charts';
import {useQuery} from '@tanstack/react-query';
import {divIcon} from 'leaflet';
import {CircleMarker, Marker, Polyline, Tooltip as MapTooltip} from 'react-leaflet';
import {LuExternalLink} from 'react-icons/lu';
import {SiKomoot, SiStrava} from 'react-icons/si';
import {Area, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {getFetcher} from '../../hooks/useFetcher';
import {
  betterStart,
  climbing,
  FORECAST_DAYS,
  haversine,
  HourForecast,
  isLoop,
  NOTICEABLE_WIND,
  outfit,
  Pace,
  PlannedRoute,
  rainSpell,
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
import {TrackMap} from './TrackMap';
import {duration, km, metres, number} from '../format';

const fetchForecasts = getFetcher<HourForecast[][]>('weather.forecast');

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
// Head wind, nothing much, tail wind: two hues and a neutral middle.
const WIND_COLORS = {head: '#e5484d', calm: '#8b8d98', tail: '#12a594'};
// The same, paler, for the arrows on top of the route.
const ARROW_COLORS = {head: '#ffa8a8', calm: '#f2f2f4', tail: '#8ff0d4'};
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
// About this many wind arrows and distance marks on the map, whatever the route's length.
const ARROWS = 10;
const KM_STEPS = [5, 10, 20, 25, 50, 100];

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
  const size = Math.round(Math.min(56, 32 + point.wind * 0.9));
  const icon = divIcon({
    className: '',
    iconSize: [size, size + 14],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6))">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform:rotate(${point.windFrom + 180}deg)">
        <path d="M12 2 L16.5 9.5 L13.1 9.5 L13.1 22 L10.9 22 L10.9 9.5 L7.5 9.5 Z" fill="${windColor(point.headwind, ARROW_COLORS)}"/>
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

type Series = {name: keyof WeatherPoint; label: string; color: string; kind: 'line' | 'area'; dashed?: boolean};

/** One measure along the ride, against the time of day, with the km in the tooltip. */
const WeatherChart = ({
  weather,
  series,
  unit,
  locale,
  zeroLine = false,
  onHover,
}: {
  weather: WeatherPoint[];
  series: Series[];
  unit: string;
  locale: string;
  zeroLine?: boolean;
  // The forecast point under the pointer, or null once it leaves, for the map's marker.
  onHover: (sample: number | null) => void;
}) => {
  const chart = useChart({
    data: weather,
    series: series.map(({name, label, color}) => ({name, label, color})),
  });

  return (
    <Chart.Root width="100%" height="220px" chart={chart}>
      <ResponsiveContainer width="100%" height="100%">
        {/* The charts share a syncId, so the pointer over one shows the same moment on all. */}
        <ComposedChart
          data={chart.data}
          syncId="ride-weather"
          onMouseMove={({activeTooltipIndex}) =>
            onHover(undefined === activeTooltipIndex ? null : Number(activeTooltipIndex))
          }
          onMouseLeave={() => onHover(null)}
        >
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
          />
          {zeroLine && <ReferenceLine y={0} stroke={chart.color('border')} />}
          {1 < series.length && <Legend content={<Chart.Legend />} />}
          <Tooltip
            isAnimationActive={false}
            content={({payload, active}) =>
              !active || !payload?.length ? null : (
                <ChartTooltip>
                  {clock((payload[0].payload as WeatherPoint).time, locale)} ·{' '}
                  {km((payload[0].payload as WeatherPoint).distance, locale)}
                  {series.map(({name, label}) => (
                    <div key={name}>
                      {label}: {number(Number((payload[0].payload as WeatherPoint)[name]), locale)}
                      {unit}
                    </div>
                  ))}
                </ChartTooltip>
              )
            }
          />
          {series.map(({name, color, kind, dashed}) =>
            'area' === kind ? (
              <Area
                key={name}
                dataKey={chart.key(name)}
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
                dataKey={chart.key(name)}
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
const Field = ({label, value, detail}: {label: string; value: string; detail?: string}) => (
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

type RideWeatherResultsProps = {route: PlannedRoute; start: number; pace: Pace; locale: string};

/**
 * The weather on a planned ride: when the rider reaches each part of the route at their pace,
 * the forecast there and then, as figures, a map with the wind and charts. Shared by the
 * rider's own page and the page a shared link opens.
 */
const RideWeatherResults = ({route, start, pace, locale}: RideWeatherResultsProps) => {
  const {points} = route;
  const distance = points.at(-1)?.distance ?? 0;
  const climb = useMemo(() => climbing(points), [points]);
  const times = useMemo(() => timeline(points, pace), [points, pace]);
  const moving = times.at(-1) ?? 0;
  const finish = start + moving * 1000;
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
  const [hovered, setHovered] = useState<number | null>(null);
  const advice = useMemo(() => {
    if (!forecasts.data || 0 === weather.length) return null;
    const cost = windCost(weather);
    const loop = isLoop(points);

    return {
      cost,
      better: betterStart(startOptions(points, times, start, indexes, forecasts.data), start),
      reversedCost: loop ? windCost(weatherReversed(points, pace, start, indexes, forecasts.data)) : null,
      sun: sunTimes(start, [points[0].lat, points[0].lng]),
      spell: rainSpell(weather),
      wear: outfit(weather),
    };
  }, [forecasts.data, weather, points, times, start, indexes, pace]);
  const when = new Date(start).toLocaleString(locale, {weekday: 'long', day: 'numeric', month: 'long'});
  const has = 0 < weather.length;
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
          {when}, {clock(start, locale)} to {clock(finish, locale)}
        </Text>
        <Grid templateColumns={{base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', xl: 'repeat(8, 1fr)'}} gap="16px">
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
          <Field label="Moving time" value={duration(moving)} detail={`back at ${clock(finish, locale)}`} />
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
            value={has ? `${number(average('wind'), locale)} km/h ${compass(windFrom % 360)}` : '…'}
            detail={has ? `gusts up to ${number(Math.max(...weather.map(({gust}) => gust)), locale)} km/h` : undefined}
          />
          <Field
            label="Head / tail wind"
            value={has ? `${number(shares.head * 100, locale)} % / ${number(shares.tail * 100, locale)} %` : '…'}
            detail="of the route"
          />
        </Grid>
      </Card>

      {null !== advice && (
        <Card>
          <CardTitle>For this ride</CardTitle>
          <Grid templateColumns={{base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)'}} gap="16px">
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
            {null !== advice.sun && (
              <Field
                label="Daylight"
                value={
                  finish > advice.sun.set
                    ? `Dark from ${clock(advice.sun.set, locale)}`
                    : `Sunset ${clock(advice.sun.set, locale)}`
                }
                detail={
                  start < advice.sun.rise
                    ? `starts before sunrise (${clock(advice.sun.rise, locale)}): lights on`
                    : finish > advice.sun.set
                      ? `the last ${minutes((finish - advice.sun.set) / 1000)} min in the dark: lights on`
                      : `back ${duration((advice.sun.set - finish) / 1000)} before it`
                }
              />
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
        </Card>
      )}

      {tooFar && <Text color="fg.muted">The forecast goes {FORECAST_DAYS} days ahead: pick an earlier day.</Text>}
      {forecasts.isError && (
        <Text color="fg.error">No forecast for now: {forecasts.error.message || 'try again'}.</Text>
      )}

      <Stack gap="8px">
        <TrackMap
          tracks={[points.map(({lat, lng}) => [lat, lng])]}
          center={[points[0].lat, points[0].lng]}
          height={{base: '340px', md: '500px'}}
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
          {null !== hovered && undefined !== weather[hovered] && (
            <CircleMarker
              center={[weather[hovered].lat, weather[hovered].lng]}
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

      {has && (
        <Grid templateColumns={{base: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))'}} gap="16px">
          <Card>
            <CardTitle>Temperature</CardTitle>
            <WeatherChart
              weather={weather}
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
            <WeatherChart
              weather={weather}
              onHover={setHovered}
              unit="%"
              locale={locale}
              series={[
                {name: 'rainChance', label: 'Chance of rain', color: 'blue.solid', kind: 'area'},
                {name: 'cloud', label: 'Cloud cover', color: 'gray.solid', kind: 'line'},
              ]}
            />
          </Card>
          <Card>
            <CardTitle>Wind</CardTitle>
            <WeatherChart
              weather={weather}
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
            <WeatherChart
              weather={weather}
              onHover={setHovered}
              unit=" m"
              locale={locale}
              series={[{name: 'altitude', label: 'Altitude', color: 'gray.solid', kind: 'area'}]}
            />
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
