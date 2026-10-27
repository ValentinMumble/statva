import {Badge, HStack, Icon, Text} from '@chakra-ui/react';
import {FaTrophy} from 'react-icons/fa6';
import {LuLock} from 'react-icons/lu';
import {activityHighlight, bestKomRank, hasEmoji} from '../../models';
import {Activity, DetailedActivity} from '../../models/strava';

// Strava's gold, for its top 10 trophies.
const TROPHY_GOLD = '#e8b10c';

/** Strava's top 10 mark: a gold cup, with the place beside it. */
const TopTenTrophy = ({rank}: {rank: number}) => (
  <HStack gap="2px" flexShrink={0} title={`Top ${rank} on a segment`} aria-label={`Top ${rank}`}>
    <Icon as={FaTrophy} boxSize="15px" color={TROPHY_GOLD} aria-hidden={true} />
    <Text fontSize="sm" fontWeight="semibold" lineHeight="1">
      {rank}
    </Text>
  </HStack>
);

/**
 * Small marks after an activity's name: private, a race, a 100 km day, a KOM or a top 10 on a
 * segment (when its details are loaded).
 */
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
  const rank = bestKomRank(detail);

  if (null === highlight && null === rank && !isPrivate && !isUnprocessed) return null;

  return (
    <HStack gap="4px" flexShrink={0}>
      {isUnprocessed && (
        <Badge size="sm" variant="subtle" colorPalette="brand">
          No emoji
        </Badge>
      )}
      {isPrivate && <Icon as={LuLock} boxSize="13px" color="fg.muted" aria-label="Private" />}
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
      {1 === rank && (
        <Badge size="sm" variant="subtle" colorPalette="yellow">
          KOM 👑
        </Badge>
      )}
      {null !== rank && 1 < rank && <TopTenTrophy rank={rank} />}
    </HStack>
  );
};

export {HighlightTags, TopTenTrophy};
