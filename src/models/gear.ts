import {Athlete} from './strava';

type Gear = {
  id: string;
  type: 'bike' | 'shoes';
  name: string;
  primary: boolean;
  retired: boolean;
};

/** The rider's bikes and shoes, as their Strava profile lists them. */
const gearOf = (athlete: Athlete | null): Gear[] => [
  ...(athlete?.bikes ?? []).map(({id, name, primary, retired}) => ({id, type: 'bike' as const, name, primary, retired})),
  ...(athlete?.shoes ?? []).map(({id, name, primary, retired}) => ({id, type: 'shoes' as const, name, primary, retired})),
];

/** The bike Strava marks as primary, or else the first one. */
const primaryBike = (gear: Gear[]): string | null => {
  const bikes = gear.filter(({type}) => 'bike' === type);

  return (bikes.find(({primary}) => primary) ?? bikes[0])?.id ?? null;
};

export {gearOf, primaryBike};
export type {Gear};
