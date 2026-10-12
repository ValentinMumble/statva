import {Badge, HStack} from '@chakra-ui/react';
import {activityHighlight, hasKom} from '../../models';
import {Activity, DetailedActivity} from '../../models/strava';

/** Small tags after an activity's name: a race, a 100 km day, a KOM (when its details are loaded). */
const HighlightTags = ({activity, detail = null}: {activity: Activity; detail?: DetailedActivity | null}) => {
  const highlight = activityHighlight(activity);
  const kom = hasKom(detail);

  if (null === highlight && !kom) return null;

  return (
    <HStack gap="4px" flexShrink={0}>
      {'race' === highlight && (
        <Badge size="sm" variant="solid" colorPalette="brand">
          Race
        </Badge>
      )}
      {'long' === highlight && (
        <Badge size="sm" variant="subtle" colorPalette="brand">
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
