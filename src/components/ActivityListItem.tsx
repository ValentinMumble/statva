import {HStack, ListIcon, ListItem, Spacer, Tag, TagLabel, TagLeftIcon, Text} from '@chakra-ui/react';
import {ACTIVITY_URL, DetailedActivity, SortType, TAGS, getActivityIcon} from '../models';

type ActivityListItemProps = {
  activity: DetailedActivity;
  activeSort: SortType;
};

const ActivityListItem = ({activity, activeSort}: ActivityListItemProps) => {
  return (
    <ListItem height={8}>
      <HStack opacity={activity.private ? 0.6 : 1} _hover={{opacity: 1}}>
        <ListIcon as={getActivityIcon(activity)} />
        <Text>
          <a target="_blank" href={`${ACTIVITY_URL}${activity.id}`}>
            {activity.name}
          </a>
        </Text>
        <Spacer />
        {TAGS.map(tag => (
          <Tag key={tag.sortType} size="sm" colorScheme={activeSort === tag.sortType ? 'orange' : undefined}>
            <TagLeftIcon as={tag.icon} />
            <TagLabel>{tag.label(activity)}</TagLabel>
          </Tag>
        ))}
      </HStack>
    </ListItem>
  );
};

export {ActivityListItem};
