import {IconType} from 'react-icons';
import {LuBike, LuDumbbell, LuFootprints, LuMountain, LuWaves} from 'react-icons/lu';
import {PiTennisBallBold} from 'react-icons/pi';
import {TbBrandZwift, TbRun} from 'react-icons/tb';

const ICONS: Record<string, IconType> = {
  Ride: LuBike,
  GravelRide: LuBike,
  MountainBikeRide: LuBike,
  EBikeRide: LuBike,
  VirtualRide: TbBrandZwift,
  Run: TbRun,
  TrailRun: TbRun,
  Walk: LuFootprints,
  Hike: LuMountain,
  Swim: LuWaves,
  Tennis: PiTennisBallBold,
};

const sportIcon = (sport: string): IconType => ICONS[sport] ?? LuDumbbell;

export {sportIcon};
