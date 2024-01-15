import {ListIcon, ListItem, Show, Spacer, Tag, TagLabel, TagLeftIcon, Text, Tooltip} from '@chakra-ui/react';
import {SortType, TAGS, getActivityIcon, getActivityUrl, getBikeEmoji} from '../models';
import {DetailedActivity} from '../models/strava';
import {useAthlete} from '../hooks';

type ActivityListItemProps = {
  activity: DetailedActivity;
  activeSort: SortType;
};

const ActivityListItem = ({activity, activeSort}: ActivityListItemProps) => {
  const athlete = useAthlete();

  return (
    <ListItem
      onClick={() => console.log(activity)}
      opacity={activity.private ? 0.6 : 1}
      _hover={{opacity: 1}}
      height={8}
      width={['97vw', 'unset']}
      display="flex"
      alignItems="center"
      gap={1.5}
    >
      <ListIcon as={getActivityIcon(activity)} />
      <Tooltip
        bg="gray.100"
        color="gray.700"
        hasArrow={true}
        placement="right"
        label={
          <>
            {new Date(activity.start_date).toLocaleDateString()}&nbsp;&nbsp;
            {getBikeEmoji(athlete?.bikes, activity.gear_id)}
          </>
        }
      >
        <Text>
          <a target="_blank" href={getActivityUrl(activity)}>
            {activity.name}
          </a>
        </Text>
      </Tooltip>
      <Spacer />
      {TAGS.map((tag, index) => (
        <Show key={tag.sortType} above={0 === index ? undefined : 'sm'}>
          <Tooltip label={tag.tooltip?.(activity)}>
            <Tag
              opacity={tag.isRelevant(activity) ? 1 : 0.4}
              size="sm"
              colorScheme={activeSort === tag.sortType ? 'orange' : undefined}
              padding="4px"
            >
              <TagLeftIcon as={tag.icon} />
              <TagLabel>{tag.label(activity)}</TagLabel>
            </Tag>
          </Tooltip>
        </Show>
      ))}
    </ListItem>
  );
};

export {ActivityListItem};
