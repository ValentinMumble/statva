import {Icon, IconProps} from '@chakra-ui/react';
import {GiMountainClimbing} from 'react-icons/gi';
import {PiBicycleFill, PiBicycle, PiTennisBallBold, PiQuestionBold} from 'react-icons/pi';
import {
  TbBrandZwift,
  TbBusStop,
  TbGymnastics,
  TbKayak,
  TbRouteX,
  TbRun,
  TbSkiJumping,
  TbSwimming,
  TbTrekking,
  TbWalk,
  TbYoga,
} from 'react-icons/tb';
import {MdElectricBike} from 'react-icons/md';
import {ActivityType, WorkoutType} from '../models/strava';

const getActivityIcon = (activityType: ActivityType, isCommute: boolean = false) => {
  if (isCommute) {
    return TbBusStop;
  }

  switch (activityType) {
    case ActivityType.AlpineSki:
      return TbSkiJumping;
    case ActivityType.EMountainBikeRide:
      return MdElectricBike;
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
    case ActivityType.Workout:
      return TbGymnastics;
    case ActivityType.Yoga:
      return TbYoga;
    default:
      return PiQuestionBold;
  }
};

const getIconColor = (workoutType: WorkoutType, isGranFondo: boolean): string | undefined => {
  if (workoutType === WorkoutType.Race) {
    return 'orange.500';
  }

  if (isGranFondo) {
    return 'orange.200';
  }

  return undefined;
};

type ActivityIconProps = {
  activityType: ActivityType;
  isCommute?: boolean;
  isGranFondo?: boolean;
  workoutType?: WorkoutType;
} & IconProps;

const ActivityIcon = ({
  activityType,
  isCommute = false,
  isGranFondo = false,
  workoutType = WorkoutType.None,
  ...rest
}: ActivityIconProps) => {
  const ActivityIconType = getActivityIcon(activityType, isCommute);

  return (
    // The span is to prevent React whining about passing a ref to the react-icon component
    <Icon {...rest} color={getIconColor(workoutType, isGranFondo)}>
      <span>
        <ActivityIconType />
      </span>
    </Icon>
  );
};

export {ActivityIcon};
