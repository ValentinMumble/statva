import {useEffect, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {loadCachedData, saveCachedData} from '../api/browserCache';
import {Activity, DetailedActivity} from '../models/strava';
import {isWholeListLoaded, markListFromCache} from './useActivities';

// Saving waits for changes to settle: a sync or a first load changes the list many times in a row.
const SAVE_DELAY_MS = 3_000;
const CACHED_KEYS = ['activities', 'activityMeta'];

/**
 * Shows the activities and details this browser kept from the rider's last visit at once, then
 * lets them refresh from the server; keeps them again whenever they change. Ready once the
 * kept data is in place (at once in the demo, which has nothing to wait for).
 */
const useBrowserCache = (athleteId: number | null): boolean => {
  const queryClient = useQueryClient();
  const [readyFor, setReadyFor] = useState<number | null>(null);

  useEffect(() => {
    if (null === athleteId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe = () => {};

    void (async () => {
      const cached = await loadCachedData(athleteId);
      if (cancelled) return;
      if (null !== cached && undefined === queryClient.getQueryData(['activities'])) {
        queryClient.setQueryData(['activities'], cached.activities);
        queryClient.setQueryData(['activityMeta'], cached.activityMeta);
        markListFromCache();
        // The details reload in the background the first time a page needs them.
        void queryClient.invalidateQueries({queryKey: ['activityMeta'], refetchType: 'none'});
      }
      setReadyFor(athleteId);

      unsubscribe = queryClient.getQueryCache().subscribe(event => {
        if ('updated' !== event.type || 'success' !== event.action.type) return;
        if (!CACHED_KEYS.includes(String(event.query.queryKey[0]))) return;

        clearTimeout(timer);
        timer = setTimeout(() => {
          const activities = queryClient.getQueryData<Activity[]>(['activities']);
          // Only the whole list is kept: a list cut short would hide the rest on the next visit.
          if (undefined === activities || !isWholeListLoaded()) return;
          const activityMeta = queryClient.getQueryData<Record<string, DetailedActivity>>(['activityMeta']) ?? {};
          void saveCachedData(athleteId, {activities, activityMeta});
        }, SAVE_DELAY_MS);
      });
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [athleteId, queryClient]);

  return null === athleteId || readyFor === athleteId;
};

export {useBrowserCache};
