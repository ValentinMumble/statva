import {IconButton} from '@chakra-ui/react';
import {MdOutlineNotes} from 'react-icons/md';
import {HoverCardContent, HoverCardRoot, HoverCardTrigger} from '../components/ui';
import {Activity, DetailedActivity} from '../models/strava';
import {cleanActivity} from '../models';
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

    await upsertActivity(cleanActivity(fullActivity));
    refetch();
  };

  const hasMeta = activity.id in activityMeta;

  return (
    <HoverCardRoot>
      <HoverCardTrigger asChild={true}>
        <IconButton size="2xs" variant="ghost" opacity={hasMeta ? 0.7 : 0.2} onClick={handleFetchActivity}>
          <MdOutlineNotes />
        </IconButton>
      </HoverCardTrigger>
      {hasMeta && (
        <HoverCardContent whiteSpaceCollapse="preserve">{activityMeta[activity.id].description}</HoverCardContent>
      )}
    </HoverCardRoot>
  );
};

export {ActivityMeta};
