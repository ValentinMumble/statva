import {Box, Center, Icon} from '@chakra-ui/react';
import {useMemo} from 'react';
import {decodePolyline, routeShape} from '../../models';
import {Activity} from '../../models/strava';
import {sportIcon} from './sport';

/** The shape of an activity's route, or its sport's icon when it has none (indoors, pools). */
const RouteThumb = ({activity, size = 56}: {activity: Activity; size?: number}) => {
  const shape = useMemo(
    () => routeShape(decodePolyline(activity.map?.summary_polyline ?? ''), size, 6),
    [activity.map?.summary_polyline, size],
  );

  if (null === shape) {
    return (
      <Center width={`${size}px`} height={`${size}px`} borderRadius="10px" background="bg.subtle" flexShrink={0}>
        <Icon as={sportIcon(activity.sport_type)} boxSize="22px" color="fg.muted" />
      </Center>
    );
  }

  return (
    <Box width={`${size}px`} height={`${size}px`} borderRadius="10px" background="bg.subtle" flexShrink={0}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <path d={shape.path} fill="none" stroke="var(--chakra-colors-brand-solid)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={shape.start[0]} cy={shape.start[1]} r={2.5} fill="var(--chakra-colors-fg)" />
      </svg>
    </Box>
  );
};

export {RouteThumb};
