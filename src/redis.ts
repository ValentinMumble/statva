import {Redis} from '@upstash/redis';
import {Event, Labels} from './models';

const EVENTS_KEY = 'events';
const LABELS_KEY = 'labels';

const client = () =>
  new Redis({
    url: import.meta.env.VITE_KV_REST_API_URL,
    token: import.meta.env.VITE_KV_REST_API_TOKEN,
  });

const getEvents = async (): Promise<Event[] | null> => {
  const rawEvents = await client().hgetall<Record<string, Event>>(EVENTS_KEY);

  if (null === rawEvents) return null;

  return Object.values(rawEvents)
    .map(event => ({...event, date: new Date(event.date)}))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
};

const deleteEvent = async (eventId: string) => {
  await client().hdel(EVENTS_KEY, eventId);
};

const deleteLabel = async (key: string) => {
  await client().hdel(LABELS_KEY, key);
};

const addEvent = async (event: Event) => {
  await client().hset(EVENTS_KEY, {[event.id]: event});
};

const setLabel = async (key: string, label: string) => {
  await client().hset(LABELS_KEY, {[key]: label});
};

const getLabels = async (): Promise<Labels> => {
  const labels = await client().hgetall<Labels>(LABELS_KEY);
  const collator = new Intl.Collator('en', {numeric: true, sensitivity: 'base'});

  return Object.fromEntries(Object.entries(labels ?? {}).sort(([keyA], [keyB]) => collator.compare(keyA, keyB)));
};

export {addEvent, setLabel, deleteEvent, deleteLabel, getEvents, getLabels};
