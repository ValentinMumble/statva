import {Redis} from '@upstash/redis';
import {Event} from './models';

const EVENTS_KEY = 'events';

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

const addEvent = async (event: Event) => {
  await client().hset(EVENTS_KEY, {[event.id]: event});
};

export {addEvent, deleteEvent, getEvents};
