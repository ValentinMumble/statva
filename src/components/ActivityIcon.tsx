import {Icon, IconProps} from '@chakra-ui/react';
import {GiMountainClimbing} from 'react-icons/gi';
import {PiBicycleFill, PiBicycle, PiTennisBallBold, PiQuestionBold} from 'react-icons/pi';
import {
  TbBrandZwift,
  TbBusStop,
  TbKayak,
  TbRun,
  TbSkiJumping,
  TbSwimming,
  TbTreadmill,
  TbTrekking,
  TbWalk,
} from 'react-icons/tb';
import {ActivityType} from '../models/strava';

const getActivityIcon = (activityType: ActivityType, isCommute: boolean = false) => {
  if (isCommute) {
    return TbBusStop;
  }

  switch (activityType) {
    case ActivityType.AlpineSki:
      return TbSkiJumping;
    case ActivityType.GravelRide:
      return PiBicycleFill;
    case ActivityType.Hike:
      return TbTrekking;
    case ActivityType.Canoeing:
    case ActivityType.Kayaking:
      return TbKayak;
    case ActivityType.Ride:
      return PiBicycle;
    case ActivityType.RockClimbing:
      return GiMountainClimbing;
    case ActivityType.TrailRun:
      return TbTreadmill;
    case ActivityType.Run:
      return TbRun;
    case ActivityType.Swim:
      return TbSwimming;
    case ActivityType.Tennis:
      return PiTennisBallBold;
    case ActivityType.VirtualRide:
      return TbBrandZwift;
    case ActivityType.Walk:
      return TbWalk;
    default:
      return PiQuestionBold;
  }
};

type ActivityIconProps = {
  activityType: ActivityType;
  isCommute?: boolean;
} & IconProps;

const ActivityIcon = ({activityType, isCommute = false, ...rest}: ActivityIconProps) => {
  const ActivityIconType = getActivityIcon(activityType, isCommute);

  return (
    // The span is to prevent React whining about passing a ref to the react-icon component
    <Icon {...rest}>
      <span>
        <ActivityIconType />
      </span>
    </Icon>
  );
};

export {ActivityIcon};
