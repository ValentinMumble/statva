import {Badge, HStack, Icon} from '@chakra-ui/react';
import {LuLock} from 'react-icons/lu';
import {activityHighlight, hasEmoji, hasKom} from '../../models';
import {Activity, DetailedActivity} from '../../models/strava';

/** Small marks after an activity's name: private, a race, a 100 km day, a KOM (when its details are loaded). */
// The lock is for lists where private activities are mixed in (Home); the Activities list
// already fades them and filters them on demand.
const HighlightTags = ({
  activity,
  detail = null,
  showPrivate = false,
  showUnprocessed = false,
}: {
  activity: Activity;
  detail?: DetailedActivity | null;
  showPrivate?: boolean;
  // For riders who tag names with an emoji: points out a name still without one.
  showUnprocessed?: boolean;
}) => {
  const isPrivate = showPrivate && activity.private;
  const isUnprocessed = showUnprocessed && !hasEmoji(activity.name);
  const highlight = activityHighlight(activity);
  const kom = hasKom(detail);

  if (null === highlight && !kom && !isPrivate && !isUnprocessed) return null;

  return (
    <HStack gap="4px" flexShrink={0}>
      {isUnprocessed && (
        <Badge size="sm" variant="subtle" colorPalette="brand">
          No emoji
        </Badge>
      )}
      {isPrivate && (
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
