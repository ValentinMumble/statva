import {useState, type ReactNode} from 'react';
import {Spinner, Text} from '@chakra-ui/react';
import {useQuery} from '@tanstack/react-query';
import {Tooltip} from './ui';
import {ZoneBar} from './ZoneBar';
import {fetchActivityZones} from '../api';
import {ActivityZoneType} from '../models/strava';

type ZoneTooltipProps = {
  activityId: number;
  hasHeartrate: boolean;
  children: ReactNode;
};

const ZoneTooltip = ({activityId, hasHeartrate, children}: ZoneTooltipProps) => {
  const [hovered, setHovered] = useState(false);

  const {data: hrZones, isLoading} = useQuery({
    queryKey: ['zones', activityId],
    queryFn: async () => {
      const zones = await fetchActivityZones(activityId);
      const hrZone = zones.find((zone) => zone.type === ActivityZoneType.Heartrate);
      return hrZone?.distribution_buckets ?? null;
    },
    enabled: hovered && hasHeartrate,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (!hasHeartrate) return <>{children}</>;

  const content = isLoading ? (
    <Spinner size="xs" />
  ) : hrZones ? (
    <ZoneBar zones={hrZones} />
  ) : (
    <Text fontSize="xs">No zone data</Text>
  );

  return (
    <Tooltip portalled content={content} openDelay={300} contentProps={{bg: 'gray.900', color: 'white', p: 3, borderRadius: 'md'}}>
      <span onMouseEnter={() => setHovered(true)}>{children}</span>
    </Tooltip>
  );
};

export {ZoneTooltip};
