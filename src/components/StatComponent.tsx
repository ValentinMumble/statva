import {Skeleton, SkeletonText} from '@chakra-ui/react';
import {StatHelpText, StatLabel, StatRoot, StatValueText, Tooltip} from '../components/ui';
import {Activity, Athlete} from '../models/strava';
import {Stat} from './Stats';

type StatComponentProps = {
  stat: Stat;
  activities: Activity[] | null;
  athlete: Athlete | null;
  onClick?: () => void;
};

const StatComponent = ({stat, activities, athlete, onClick}: StatComponentProps) => {
  if (null === activities || null === athlete) {
    return (
      <StatRoot>
        <Skeleton width="40%">l</Skeleton>
        <Skeleton width="80%">l</Skeleton>
        <SkeletonText width="70%" noOfLines={1} />
      </StatRoot>
    );
  }

  const {label, value, helpText, info} = stat(activities, athlete);
  const statContent = (
    <StatRoot onClick={onClick}>
      <StatLabel fontSize="1.2em">{label}</StatLabel>
      <StatValueText fontSize="1.2em">{value}</StatValueText>
      <StatHelpText fontSize=".8em">{helpText}</StatHelpText>
    </StatRoot>
  );

  return info ? <Tooltip content={info}>{statContent}</Tooltip> : statContent;
};

export {StatComponent};
