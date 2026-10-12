import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {DEFAULT_SETTINGS, gearOf, PartRules, primaryBike, setRiderProfile, Settings} from '../models';
import {useAllActivities} from './useActivities';
import {useAthlete} from './useAthlete';
import {useEvents} from './useEvents';
import {getFetcher} from './useFetcher';

const fetchSettings = getFetcher<Partial<Settings> | null>('settings.get');

type ResolvedSettings = Settings & {defaultBike: string; costBike: string; partRules: PartRules};

/** The rider's settings on top of the defaults, with the default bike worked out from Strava when unset. */
const useSettings = (): ResolvedSettings => {
  const {data} = useQuery({queryKey: ['settings'], queryFn: fetchSettings});
  const athlete = useAthlete();
  const settings = {...DEFAULT_SETTINGS, ...(data ?? {})};
  const defaultBike = settings.defaultBike ?? primaryBike(gearOf(athlete)) ?? '';

  // The calculations read these directly; setting the same values again changes nothing.
  setRiderProfile({
    heartRate: settings.heartRate,
    weightKg: settings.weightKg,
    normalizedPowerFromNote: settings.normalizedPowerFromNote,
  });

  return {
    ...settings,
    defaultBike,
    costBike: settings.costBike ?? defaultBike,
    partRules: {limitsKm: settings.partLimitsKm, retiredChains: settings.retiredChains},
  };
};

/** The rider's bikes and shoes, retired ones included. */
const useGear = () => {
  const athlete = useAthlete();
  const {data: activities} = useAllActivities();
  const {events} = useEvents();

  return useMemo(
    () => gearOf(athlete, [...(activities ?? []).map(({gear_id}) => gear_id), ...events.map(({bike}) => bike)]),
    [athlete, activities, events],
  );
};

export {useGear, useSettings};
export type {ResolvedSettings};
