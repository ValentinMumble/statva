import {Box, HStack, Text} from '@chakra-ui/react';
import {LuSunrise, LuSunset} from 'react-icons/lu';

const MINUTE = 60000;
// The day is drawn from a little before sunrise (or the start) to a little after sunset (or
// the finish), so the twilight on each side shows.
const MARGIN = 50 * MINUTE;
// The sky through the day: night, twilight, dawn, day, the warm hour before sunset, dusk.
const SKY = {
  night: '#1b2440',
  twilight: '#4a4878',
  dawn: '#f4a259',
  day: '#8ec5e8',
  golden: '#f6c96b',
  dusk: '#ef7b4d',
};

type DaylightBarProps = {
  start: number;
  finish: number;
  sun: {rise: number; set: number};
  clock: (time: number) => string;
  // Stops along the way (ms), shown as gaps in the ride.
  pauses?: {start: number; end: number}[];
};

/** The ride on the day's light: a sky from night to night, the ride framed on it, and the sun's times. */
const DaylightBar = ({start, finish, sun, clock, pauses = []}: DaylightBarProps) => {
  const from = Math.min(start, sun.rise) - MARGIN;
  const to = Math.max(finish, sun.set) + MARGIN;
  const at = (time: number): number => Math.min(100, Math.max(0, ((time - from) / (to - from)) * 100));
  const stops: [string, number][] = [
    [SKY.night, 0],
    [SKY.twilight, at(sun.rise - 30 * MINUTE)],
    [SKY.dawn, at(sun.rise)],
    [SKY.day, at(sun.rise + 60 * MINUTE)],
    [SKY.day, at(sun.set - 90 * MINUTE)],
    [SKY.golden, at(sun.set - 30 * MINUTE)],
    [SKY.dusk, at(sun.set)],
    [SKY.twilight, at(sun.set + 30 * MINUTE)],
    [SKY.night, 100],
  ];

  return (
    <Box
      role="img"
      aria-label={`Ride from ${clock(start)} to ${clock(finish)}, sunrise ${clock(sun.rise)}, sunset ${clock(sun.set)}`}
      marginTop="10px"
    >
      <Box position="relative" height="26px">
        <Box
          position="absolute"
          insetX="0"
          top="7px"
          height="12px"
          borderRadius="full"
          background={`linear-gradient(to right, ${stops.map(([color, place]) => `${color} ${place}%`).join(', ')})`}
        />
        {/* The stops, as darker gaps in the sky under the ride. */}
        {pauses.map(pause => (
          <Box
            key={pause.start}
            position="absolute"
            top="7px"
            height="12px"
            left={`${at(pause.start)}%`}
            width={`${Math.max(0.6, at(pause.end) - at(pause.start))}%`}
            background="bg.panel"
            opacity={0.7}
            title={`Stopped ${clock(pause.start)} to ${clock(pause.end)}`}
          />
        ))}
        {/* The ride, framed on the sky: what is past sunset sits on the dark. */}
        <Box
          position="absolute"
          top="2px"
          bottom="2px"
          left={`${at(start)}%`}
          width={`${at(finish) - at(start)}%`}
          minWidth="6px"
          borderWidth="2px"
          borderColor="fg"
          borderRadius="6px"
          boxShadow="0 0 0 1px var(--chakra-colors-bg-panel)"
        />
      </Box>
      <Box position="relative" height="18px" fontSize="xs" color="fg.muted">
        {(
          [
            [sun.rise, LuSunrise],
            [sun.set, LuSunset],
          ] as const
        ).map(([time, Icon]) => (
          <HStack
            key={time}
            position="absolute"
            left={`${at(time)}%`}
            // Centred in the middle, held inside the bar near its ends.
            transform={`translateX(-${at(time)}%)`}
            gap="3px"
            whiteSpace="nowrap"
          >
            <Icon />
            <Text as="span" fontFamily="figure">
              {clock(time)}
            </Text>
          </HStack>
        ))}
      </Box>
    </Box>
  );
};

export {DaylightBar};
