import {Box, Center, Icon} from '@chakra-ui/react';
import {useMemo} from 'react';
import {activityHighlight, decodePolyline, routeShape} from '../../models';
import {Activity} from '../../models/strava';
import {sportIcon} from './sport';

// A race is a solid orange tile, a 100 km day a light one with an orange ring: the two
// stand out at a glance in any list.
const TILE = {
  race: {background: 'brand.solid', ring: 'none', stroke: 'white', dot: 'white', icon: 'white'},
  long: {background: 'brand.muted', ring: 'inset 0 0 0 1.5px var(--chakra-colors-brand-solid)', stroke: 'var(--chakra-colors-brand-solid)', dot: 'var(--chakra-colors-fg)', icon: 'brand.fg'},
  plain: {background: 'bg.subtle', ring: 'none', stroke: 'var(--chakra-colors-brand-solid)', dot: 'var(--chakra-colors-fg)', icon: 'fg.muted'},
};

/** The shape of an activity's route, or its sport's icon when it has none (indoors, pools). */
const RouteThumb = ({activity, size = 56}: {activity: Activity; size?: number}) => {
  const shape = useMemo(
    () => routeShape(decodePolyline(activity.map?.summary_polyline ?? ''), size, 6),
    [activity.map?.summary_polyline, size],
  );
  const tile = TILE[activityHighlight(activity) ?? 'plain'];

  if (null === shape) {
    return (
      <Center width={`${size}px`} height={`${size}px`} borderRadius="10px" background={tile.background} boxShadow={tile.ring} flexShrink={0}>
        <Icon as={sportIcon(activity.sport_type)} boxSize="22px" color={tile.icon} />
      </Center>
    );
  }

  return (
    <Box width={`${size}px`} height={`${size}px`} borderRadius="10px" background={tile.background} boxShadow={tile.ring} flexShrink={0}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <path d={shape.path} fill="none" stroke={tile.stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={shape.start[0]} cy={shape.start[1]} r={2.5} fill={tile.dot} />
      </svg>
    </Box>
  );
};

export {RouteThumb};
