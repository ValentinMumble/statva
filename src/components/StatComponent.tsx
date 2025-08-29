import {Skeleton, SkeletonText, Stat} from '@chakra-ui/react';
import {Tooltip} from '../components/ui';
import {Activity, Athlete, DetailedActivity} from '../models/strava';
import {StatEntry} from './Stats';

type StatComponentProps = {
  stat: StatEntry;
  activities: Activity[] | null;
  activityMeta: Record<string, DetailedActivity>;
  athlete: Athlete | null;
  onClick?: () => void;
};

const StatComponent = ({stat, activities, activityMeta, athlete, onClick}: StatComponentProps) => {
  if (null === activities || null === athlete) {
    return (
      <Stat.Root>
        <Skeleton width="40%">l</Skeleton>
        <Skeleton width="80%">l</Skeleton>
        <SkeletonText width="70%" noOfLines={1} />
      </Stat.Root>
    );
  }

  const {label, value, helpText, info} = stat(activities, activityMeta, athlete);
  const statContent = (
    <Stat.Root onClick={onClick}>
      <Stat.Label fontSize="1.2em">{label}</Stat.Label>
      <Stat.ValueText fontSize="1.2em">{value}</Stat.ValueText>
      <Stat.HelpText fontSize=".8em">{helpText}</Stat.HelpText>
    </Stat.Root>
  );

  return info ? <Tooltip content={info}>{statContent}</Tooltip> : statContent;
};

export {StatComponent};
