import {Badge, HStack, Icon} from '@chakra-ui/react';
import {LuLock} from 'react-icons/lu';
import {activityHighlight, hasKom} from '../../models';
import {Activity, DetailedActivity} from '../../models/strava';

/** Small marks after an activity's name: private, a race, a 100 km day, a KOM (when its details are loaded). */
const HighlightTags = ({activity, detail = null}: {activity: Activity; detail?: DetailedActivity | null}) => {
  const highlight = activityHighlight(activity);
  const kom = hasKom(detail);

  if (null === highlight && !kom && !activity.private) return null;

  return (
    <HStack gap="4px" flexShrink={0}>
      {activity.private && (
        <Icon as={LuLock} boxSize="13px" color="fg.muted" aria-label="Private" />
      )}
      {'race' === highlight && (
        <Badge size="sm" variant="solid" colorPalette="brand">
          Race
        </Badge>
      )}
      {'long' === highlight && (
        <Badge size="sm" variant="outline" colorPalette="gray">
          100 km+
        </Badge>
      )}
      {kom && (
        <Badge size="sm" variant="subtle" colorPalette="yellow">
          KOM 👑
        </Badge>
      )}
    </HStack>
  );
};

export {HighlightTags};
