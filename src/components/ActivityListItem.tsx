import {HStack, ListIcon, ListItem, Spacer, Tag, TagLabel, TagLeftIcon, Text, Tooltip} from '@chakra-ui/react';
import {SortType, TAGS, getActivityIcon, getBikeEmoji} from '../models';
import {DetailedActivity} from '../models/strava';
import {useAthlete} from '../hooks';

const ACTIVITY_URL = 'https://www.strava.com/activities/';

type ActivityListItemProps = {
  activity: DetailedActivity;
  activeSort: SortType;
};

const ActivityListItem = ({activity, activeSort}: ActivityListItemProps) => {
  const athlete = useAthlete();

  return (
    <ListItem height={8}>
      <HStack opacity={activity.private ? 0.6 : 1} _hover={{opacity: 1}}>
        <ListIcon as={getActivityIcon(activity)} />
        <Tooltip
          bg="gray.100"
          color="gray.700"
          hasArrow={true}
          placement="right"
          label={
            <>
              {new Date(activity.start_date).toLocaleDateString()}&nbsp;&nbsp;
              {getBikeEmoji(athlete?.bikes ?? [], activity.gear_id)}
            </>
          }
        >
          <Text>
            <a target="_blank" href={`${ACTIVITY_URL}${activity.id}`}>
              {activity.name}
            </a>
          </Text>
        </Tooltip>
        <Spacer />
        {TAGS.map(tag => (
          <Tooltip key={tag.sortType} label={tag.tooltip?.(activity)}>
            <Tag
              opacity={tag.isRelevant(activity) ? 1 : 0.4}
              size="sm"
              colorScheme={activeSort === tag.sortType ? 'orange' : undefined}
            >
              <TagLeftIcon as={tag.icon} />
              <TagLabel>{tag.label(activity)}</TagLabel>
            </Tag>
          </Tooltip>
        ))}
      </HStack>
    </ListItem>
  );
};

export {ActivityListItem};
