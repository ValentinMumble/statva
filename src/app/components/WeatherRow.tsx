import {Box, Flex, Stack, Text} from '@chakra-ui/react';
import {IconType} from 'react-icons';
import {LuCloud, LuCloudDrizzle, LuCloudMoon, LuCloudRain, LuCloudSun, LuMoon, LuSun} from 'react-icons/lu';
import {NOTICEABLE_WIND, WeatherPoint} from '../../models';
import {arrowLength, arrowPath, WIND_COLORS} from './ride-weather-colors';

const HOUR_MS = 3600000;
// About this many moments along the ride, whatever its length.
const MOMENTS = 10;
// The finish shows when it is at least this long after the last full hour shown.
const FINISH_GAP = 20 * 60000;

type Sky = {icon: IconType; color: string; label: string};

/** The sky at a point of the ride: rain first, then clouds, by day or night. */
const skyOf = ({rain, rainChance, cloud}: WeatherPoint, night: boolean): Sky => {
  if (40 <= rainChance && 0.3 <= rain) return {icon: LuCloudRain, color: 'blue.fg', label: 'rain'};
  if (40 <= rainChance) return {icon: LuCloudDrizzle, color: 'blue.fg', label: 'rain likely'};
  if (80 <= cloud) return {icon: LuCloud, color: 'fg.muted', label: 'cloudy'};
  if (35 <= cloud)
    return {icon: night ? LuCloudMoon : LuCloudSun, color: night ? 'fg.muted' : 'orange.fg', label: 'some clouds'};

  return night
    ? {icon: LuMoon, color: 'fg.muted', label: 'clear night'}
    : {icon: LuSun, color: 'orange.fg', label: 'sunny'};
};

/** The start, every full hour (or every two on a long ride), and the finish. */
const momentsOf = (start: number, finish: number): number[] => {
  const step = Math.max(1, Math.ceil((finish - start) / HOUR_MS / MOMENTS)) * HOUR_MS;
  const moments = [start];
  for (let time = Math.ceil(start / step) * step; time < finish; time += step) {
    if (time - moments[moments.length - 1] >= FINISH_GAP) moments.push(time);
  }
  if (finish - moments[moments.length - 1] >= FINISH_GAP) moments.push(finish);

  return moments;
};

type WeatherRowProps = {
  weather: WeatherPoint[];
  start: number;
  finish: number;
  sun: {rise: number; set: number} | null;
  clock: (time: number) => string;
};

/**
 * The ride at a glance, like a weather app: hour by hour where the rider is then, the sky,
 * the temperature and the wind, its arrow pointing where it blows, red against, green behind.
 */
const WeatherRow = ({weather, start, finish, sun, clock}: WeatherRowProps) => (
  <Flex gap="4px" justifyContent="space-between" overflowX="auto" paddingBottom="2px">
    {momentsOf(start, finish).map(moment => {
      const point = weather.reduce((closest, candidate) =>
        Math.abs(candidate.time - moment) < Math.abs(closest.time - moment) ? candidate : closest,
      );
      const night = null !== sun && (moment < sun.rise || moment > sun.set);
      const sky = skyOf(point, night);
      // 0.8 px per km/h, head and all, from 8 px up to the 28 px box.
      const arrow = arrowLength(point.wind, 0.8, 8, 28);
      const windColor =
        NOTICEABLE_WIND < point.headwind
          ? WIND_COLORS.head
          : point.headwind < -NOTICEABLE_WIND
            ? WIND_COLORS.tail
            : WIND_COLORS.calm;

      return (
        <Stack key={moment} alignItems="center" gap="4px" minWidth="48px" flex="1">
          <Text fontSize="xs" color="fg.muted" fontFamily="figure">
            {clock(moment)}
          </Text>
          <Box color={sky.color} aria-label={sky.label} role="img">
            <sky.icon size="24" />
          </Box>
          <Text fontFamily="figure" fontWeight="semibold">
            {Math.round(point.temperature)}°
          </Text>
          <Flex alignItems="center" gap="2px" fontSize="xs" fontFamily="figure" color="fg.muted">
            {/* The wind blows from windFrom: the arrow points the way it goes, as long as it is strong. */}
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <path
                transform={`rotate(${point.windFrom + 180} 14 14) translate(${(28 - arrow) / 2} ${(28 - arrow) / 2})`}
                d={arrowPath(arrow)}
                fill={windColor}
              />
            </svg>
            {Math.round(point.wind)}
          </Flex>
        </Stack>
      );
    })}
  </Flex>
);

export {WeatherRow};
