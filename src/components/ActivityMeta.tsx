import {IconButton, Image, HoverCard} from '@chakra-ui/react';
import {MdOutlineNotes} from 'react-icons/md';
import {Activity, DetailedActivity} from '../models/strava';
import {cleanActivity, isDetailedActivity} from '../models';
import {useActivityMeta, useFetcher} from '../hooks';

type ActivityMetaProps = {
  activity: Activity;
};

const ActivityMeta = ({activity}: ActivityMetaProps) => {
  const [activityMeta, refetch] = useActivityMeta();
  const fetchActivity = useFetcher<DetailedActivity>('activity.get');
  const upsertActivity = useFetcher<Activity>('activities.meta.set');

  const handleFetchActivity = async () => {
    const fullActivity = await fetchActivity(activity.id);

    if (!isDetailedActivity(fullActivity)) {
      console.error('Invalid activity received');

      return;
    }

    console.log(fullActivity);
    await upsertActivity(cleanActivity(fullActivity));
    refetch();
  };

  const hasMeta = activity.id in activityMeta;
  const hasPhoto = hasMeta && activityMeta[activity.id].photos?.primary;

  return (
    <HoverCard.Root openDelay={300}>
      <HoverCard.Trigger asChild={true}>
        <IconButton
          size="2xs"
          variant="ghost"
          opacity={hasMeta ? 0.2 : 0.05}
          _hover={{opacity: hasMeta ? 1 : 0.2}}
          onClick={handleFetchActivity}
        >
          <MdOutlineNotes />
        </IconButton>
      </HoverCard.Trigger>
      {hasMeta && (
        <HoverCard.Positioner>
          <HoverCard.Content whiteSpaceCollapse="preserve" gap="20px">
            {hasPhoto && <Image width={100} src={activityMeta[activity.id].photos?.primary?.urls[100]} />}
            {activityMeta[activity.id].description}
          </HoverCard.Content>
        </HoverCard.Positioner>
      )}
    </HoverCard.Root>
  );
};

export {ActivityMeta};
