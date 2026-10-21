import {Athlete} from './strava';

type Gear = {
  id: string;
  type: 'bike' | 'shoes';
  name: string;
  primary: boolean;
  retired: boolean;
};

/**
 * The rider's bikes and shoes. Strava's profile only lists gear still in use, so gear
 * seen anywhere else (activities, parts history) is added as retired: its rides and
 * parts stay reachable. Strava gear ids start with b for bikes and g for shoes.
 */
const gearOf = (athlete: Athlete | null, seenIds: (string | null | undefined)[] = []): Gear[] => {
  const listed: Gear[] = [
    ...(athlete?.bikes ?? []).map(({id, name, primary, retired}) => ({
      id,
      type: 'bike' as const,
      name,
      primary,
      retired,
    })),
    ...(athlete?.shoes ?? []).map(({id, name, primary, retired}) => ({
      id,
      type: 'shoes' as const,
      name,
      primary,
      retired,
    })),
  ];
  const listedIds = new Set(listed.map(({id}) => id));
  const unlisted = [...new Set(seenIds)]
    .filter((id): id is string => 'string' === typeof id && '' !== id && !listedIds.has(id))
    .sort()
    .map(id => ({
      id,
      type: id.startsWith('g') ? ('shoes' as const) : ('bike' as const),
      name: id,
      primary: false,
      retired: true,
    }));

  return [...listed, ...unlisted];
};

/** The bike Strava marks as primary, or else the first one. */
const primaryBike = (gear: Gear[]): string | null => {
  const bikes = gear.filter(({type}) => 'bike' === type);

  return (bikes.find(({primary}) => primary) ?? bikes[0])?.id ?? null;
};

export {gearOf, primaryBike};
export type {Gear};
