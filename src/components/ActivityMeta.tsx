import {IconButton, Image, HoverCard} from '@chakra-ui/react';
import {MdOutlineNotes} from 'react-icons/md';
import {Activity, DetailedActivity} from '../models/strava';
import {useActivityMeta} from '../hooks';
import {getFetcher} from '../hooks/useFetcher';

const refreshActivity = getFetcher<DetailedActivity>('activity.refresh');

type ActivityMetaProps = {
  activity: Activity;
};

const ActivityMeta = ({activity}: ActivityMetaProps) => {
  const {activityMeta, refetch} = useActivityMeta();

  // The server fetches the activity from Strava again and stores it.
  const handleFetchActivity = async () => {
    await refreshActivity(activity.id);
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
          opacity={hasMeta ? 0.15 : 0.05}
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
