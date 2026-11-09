import {Box, BoxProps, Center, Icon} from '@chakra-ui/react';
import {ReactNode, useMemo} from 'react';
import {activityHighlight, decodePolyline, routeShape} from '../../models';
import {Activity} from '../../models/strava';
import {sportIcon} from './sport';

// A race is a solid orange tile, a 100 km day a plain one with an orange ring a bright arc
// circles: both show at a glance, the race louder.
const TILE = {
  race: {background: 'brand.solid', ring: 'none', stroke: 'white', dot: 'white', icon: 'white'},
  long: {
    background: 'bg.subtle',
    ring: 'inset 0 0 0 1px color-mix(in srgb, var(--chakra-colors-brand-solid) 55%, transparent)',
    stroke: 'var(--chakra-colors-brand-solid)',
    dot: 'var(--chakra-colors-fg)',
    icon: 'fg.muted',
  },
  plain: {
    background: 'bg.subtle',
    ring: 'none',
    stroke: 'var(--chakra-colors-brand-solid)',
    dot: 'var(--chakra-colors-fg)',
    icon: 'fg.muted',
  },
};

// The ring of a 100 km day: faint orange, with a bright arc going round it.
const RING_GRADIENT =
  'conic-gradient(from 0deg, color-mix(in srgb, var(--chakra-colors-brand-solid) 30%, transparent) 0 62%, var(--chakra-colors-brand-solid) 82%, color-mix(in srgb, var(--chakra-colors-brand-solid) 30%, transparent) 100%)';

/**
 * A 100 km day's frame, round its thumbnail or its title: the gradient turns behind the content and shows only as a thin ring,
 * so the arc seems to run round the edge. The turning square is three times the frame's width,
 * so it covers the corners. Still for those who ask for less motion.
 */
const RingFrame = ({
  radius,
  thickness,
  fill = 'bg.subtle',
  children,
  ...boxProps
}: BoxProps & {radius: string; thickness: number; fill?: string; children: ReactNode}) => (
  <Box position="relative" overflow="hidden" borderRadius={radius} padding={`${thickness}px`} {...boxProps}>
    <Box
      position="absolute"
      top="50%"
      left="50%"
      width="300%"
      aspectRatio="1"
      transform="translate(-50%, -50%)"
      pointerEvents="none"
    >
      <Box
        width="full"
        height="full"
        background={RING_GRADIENT}
        animation="spin 4s linear infinite"
        _motionReduce={{animation: 'none'}}
      />
    </Box>
    <Box
      position="relative"
      height="full"
      borderRadius={`calc(${radius} - ${thickness}px)`}
      overflow="hidden"
      isolation="isolate"
      background={fill}
    >
      {children}
    </Box>
  </Box>
);

const LongRing = ({size, children}: {size: number; children: ReactNode}) => (
  <RingFrame radius="10px" thickness={1.5} width={`${size}px`} height={`${size}px`} flexShrink={0}>
    <Center height="full">{children}</Center>
  </RingFrame>
);

/** The shape of an activity's route, or its sport's icon when it has none (indoors, pools). */
const RouteThumb = ({activity, size = 56}: {activity: Activity; size?: number}) => {
  const shape = useMemo(
    () => routeShape(decodePolyline(activity.map?.summary_polyline ?? ''), size, 6),
    [activity.map?.summary_polyline, size],
  );
  const highlight = activityHighlight(activity);
  const tile = TILE[highlight ?? 'plain'];

  if ('long' === highlight) {
    return (
      <LongRing size={size}>
        {null === shape ? (
          <Icon as={sportIcon(activity.sport_type)} boxSize="22px" color={tile.icon} />
        ) : (
          <svg width={size - 3} height={size - 3} viewBox={`1.5 1.5 ${size - 3} ${size - 3}`} aria-hidden="true">
            <path
              d={shape.path}
              fill="none"
              stroke={tile.stroke}
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={shape.start[0]} cy={shape.start[1]} r={2.5} fill={tile.dot} />
          </svg>
        )}
      </LongRing>
    );
  }

  if (null === shape) {
    return (
      <Center
        width={`${size}px`}
        height={`${size}px`}
        borderRadius="10px"
        background={tile.background}
        boxShadow={tile.ring}
        flexShrink={0}
      >
        <Icon as={sportIcon(activity.sport_type)} boxSize="22px" color={tile.icon} />
      </Center>
    );
  }

  return (
    <Box
      width={`${size}px`}
      height={`${size}px`}
      borderRadius="10px"
      background={tile.background}
      boxShadow={tile.ring}
      flexShrink={0}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <path
          d={shape.path}
          fill="none"
          stroke={tile.stroke}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={shape.start[0]} cy={shape.start[1]} r={2.5} fill={tile.dot} />
      </svg>
    </Box>
  );
};

export {RingFrame, RouteThumb};
