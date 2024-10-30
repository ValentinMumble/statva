import {Icon, IconProps} from '@chakra-ui/react';
import {FaSwimmer} from 'react-icons/fa';
import {GiSkier, GiMountainClimbing} from 'react-icons/gi';
import {MdCommute, MdHiking, MdDirectionsWalk} from 'react-icons/md';
import {PiBicycleFill, PiBicycle, PiTennisBallBold, PiGameControllerBold, PiQuestionBold} from 'react-icons/pi';
import {TbKayak, TbRun} from 'react-icons/tb';
import {ActivityType} from '../models/strava';

const getActivityIcon = (activityType: ActivityType, isCommute: boolean = false) => {
  if (isCommute) {
    return MdCommute;
  }

  switch (activityType) {
    case ActivityType.AlpineSki:
      return GiSkier;
    case ActivityType.GravelRide:
      return PiBicycleFill;
    case ActivityType.Hike:
      return MdHiking;
    case ActivityType.Canoeing:
    case ActivityType.Kayaking:
      return TbKayak;
    case ActivityType.Ride:
      return PiBicycle;
    case ActivityType.RockClimbing:
      return GiMountainClimbing;
    case ActivityType.Run:
    case ActivityType.TrailRun:
      return TbRun;
    case ActivityType.Swim:
      return FaSwimmer;
    case ActivityType.Tennis:
      return PiTennisBallBold;
    case ActivityType.VirtualRide:
      return PiGameControllerBold;
    case ActivityType.Walk:
      return MdDirectionsWalk;
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
    <Icon {...rest}>
      <ActivityIconType />
    </Icon>
  );
};

export {ActivityIcon};
