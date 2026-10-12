import {IconType} from 'react-icons';
import {GiMountainClimbing} from 'react-icons/gi';
import {LuBike, LuDumbbell, LuFootprints, LuMountain, LuWaves} from 'react-icons/lu';
import {MdElectricBike} from 'react-icons/md';
import {PiTennisBallBold} from 'react-icons/pi';
import {TbBrandZwift, TbGymnastics, TbKayak, TbRun, TbSkiJumping, TbSnowboarding, TbYoga} from 'react-icons/tb';

const ICONS: Record<string, IconType> = {
  Ride: LuBike,
  GravelRide: LuBike,
  MountainBikeRide: LuBike,
  EBikeRide: MdElectricBike,
  EMountainBikeRide: MdElectricBike,
  Velomobile: LuBike,
  Handcycle: LuBike,
  VirtualRide: TbBrandZwift,
  Run: TbRun,
  TrailRun: TbRun,
  Walk: LuFootprints,
  Hike: LuMountain,
  Swim: LuWaves,
  Tennis: PiTennisBallBold,
  AlpineSki: TbSkiJumping,
  BackcountrySki: TbSkiJumping,
  NordicSki: TbSkiJumping,
  Snowboard: TbSnowboarding,
  Canoeing: TbKayak,
  Kayaking: TbKayak,
  Rowing: TbKayak,
  RockClimbing: GiMountainClimbing,
  Workout: TbGymnastics,
  WeightTraining: LuDumbbell,
  Yoga: TbYoga,
};

const sportIcon = (sport: string): IconType => ICONS[sport] ?? LuDumbbell;

/** "GravelRide" reads as "Gravel ride". */
const sportName = (sport: string): string => {
  const words = sport.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
};

export {sportIcon, sportName};
