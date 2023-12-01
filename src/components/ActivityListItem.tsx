import {HStack, ListIcon, ListItem, Spacer, Tag, TagLabel, TagLeftIcon, Text, Tooltip} from '@chakra-ui/react';
import {ACTIVITY_URL, DetailedActivity, SortType, TAGS, bikeLabel, getActivityIcon} from '../models';

type ActivityListItemProps = {
  activity: DetailedActivity;
  activeSort: SortType;
};

const ActivityListItem = ({activity, activeSort}: ActivityListItemProps) => {
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
              {new Date(activity.start_date).toLocaleDateString()}&nbsp;&nbsp;{bikeLabel(activity.gear_id)}
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
          <Tag
            key={tag.sortType}
            opacity={tag.isRelevant(activity) ? 1 : 0.4}
            size="sm"
            colorScheme={activeSort === tag.sortType ? 'orange' : undefined}
          >
            <TagLeftIcon as={tag.icon} />
            <TagLabel>{tag.label(activity)}</TagLabel>
          </Tag>
        ))}
      </HStack>
    </ListItem>
  );
};

export {ActivityListItem};
