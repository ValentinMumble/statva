import {Activity, DetailedActivity} from '../models/strava';

/**
 * The rider's activities and their details as last loaded, kept in this browser (IndexedDB:
 * the details weigh several MB, too much for localStorage) so a visit shows them at once while
 * the fresh ones load. Kept per athlete. Every call fails quietly: a private window, blocked
 * storage or a full disk only means waiting for the network, as before.
 */

type CachedData = {activities: Activity[]; activityMeta: Record<string, DetailedActivity>};

const DATABASE = 'statva';
const STORE = 'rider';

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const run = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(database.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
};

const loadCachedData = async (athleteId: number): Promise<CachedData | null> => {
  try {
    return ((await run('readonly', store => store.get(athleteId))) as CachedData | undefined) ?? null;
  } catch {
    return null;
  }
};

const saveCachedData = async (athleteId: number, data: CachedData): Promise<void> => {
  try {
    await run('readwrite', store => store.put(data, athleteId));
  } catch {
    // Not kept: the next visit loads from the network.
  }
};

/** Logging out or disconnecting takes every rider's data off this browser. */
const forgetCachedData = async (): Promise<void> => {
  try {
    await run('readwrite', store => store.clear());
  } catch {
    // Nothing kept, or storage blocked.
  }
};

export {forgetCachedData, loadCachedData, saveCachedData};
export type {CachedData};
