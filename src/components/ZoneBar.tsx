import {Box, Flex, Text} from '@chakra-ui/react';
import {formatDuration, formatPercent} from '../models';
import {TimedZoneRange} from '../models/strava';

// Softer, muted zone colors for dark backgrounds
const ZONE_COLORS = [
  '#6b7280', // Z0 (rest/unknown) — gray
  '#60a5fa', // Z1 — soft blue
  '#4ade80', // Z2 — soft green
  '#facc15', // Z3 — soft yellow
  '#fb923c', // Z4 — soft orange
  '#f87171', // Z5 — soft red
];

type ZoneBarProps = {
  zones: TimedZoneRange[];
};

const ZoneBar = ({zones}: ZoneBarProps) => {
  const totalTime = zones.reduce((sum, zone) => sum + zone.time, 0);
  if (totalTime === 0) return null;

  return (
    <Box minW="240px">
      <Flex h="18px" borderRadius="6px" overflow="hidden" mb={2}>
        {zones.map((zone, index) => {
          const pct = (zone.time / totalTime) * 100;
          if (pct < 1) return null;

          return (
            <Box
              key={index}
              w={`${pct}%`}
              bg={ZONE_COLORS[index + 1] ?? ZONE_COLORS[5]}
              opacity={0.8}
              transition="width 0.2s"
            />
          );
        })}
      </Flex>
      <Flex direction="column" gap="3px">
        {zones.map((zone, index) => {
          if (zone.time < 1) return null;
          const pct = zone.time / totalTime;

          const bpmLabel = zone.max > 0 ? `${zone.min}–${zone.max}` : `${zone.min}+`;

          return (
            <Flex key={index} alignItems="center" gap="6px">
              <Box w="8px" h="8px" borderRadius="full" bg={ZONE_COLORS[index + 1] ?? ZONE_COLORS[5]} opacity={0.8} flexShrink={0} />
              <Text fontSize="11px" color="gray.300" w="22px">Z{index + 1}</Text>
              <Text fontSize="11px" color="gray.500" w="58px">{bpmLabel} bpm</Text>
              <Text fontSize="11px" color="white" w="50px">{formatDuration(zone.time)}</Text>
              <Text fontSize="11px" color="gray.400">{formatPercent(pct)}</Text>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
};

export {ZoneBar};
