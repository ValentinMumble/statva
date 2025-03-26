import {Icon, IconProps} from '@chakra-ui/react';
import {GiMountainClimbing} from 'react-icons/gi';
import {PiBicycleFill, PiBicycle, PiTennisBallBold, PiQuestionBold} from 'react-icons/pi';
import {
  TbBrandZwift,
  TbBusStop,
  TbKayak,
  TbRouteX,
  TbRun,
  TbSkiJumping,
  TbSwimming,
  TbTrekking,
  TbWalk,
} from 'react-icons/tb';
import {ActivityType, WorkoutType} from '../models/strava';

//TODO add PiBicycleDuotone for GranFondo
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
      return TbRouteX;
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

//TODO handle Activity as a whole
type ActivityIconProps = {
  activityType: ActivityType;
  isCommute?: boolean;
  workoutType?: WorkoutType;
} & IconProps;

const ActivityIcon = ({
  activityType,
  isCommute = false,
  workoutType = WorkoutType.None,
  ...rest
}: ActivityIconProps) => {
  const ActivityIconType = getActivityIcon(activityType, isCommute);

  return (
    // The span is to prevent React whining about passing a ref to the react-icon component
    <Icon {...rest} color={WorkoutType.Race === workoutType ? 'orange.500' : undefined}>
      <span>
        <ActivityIconType />
      </span>
    </Icon>
  );
};

export {ActivityIcon};
