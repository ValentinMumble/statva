import {useEffect, useState} from 'react';
import {Event} from '../models';
import {Redis} from '@upstash/redis';

const useEvents = <T extends Event>(type?: string): [T[] | null, () => void] => {
  const [events, setEvents] = useState<Event[] | null>(null);

  const fetchEvents = async () => {
    const redis = new Redis({
      url: import.meta.env.VITE_KV_REST_API_URL,
      token: import.meta.env.VITE_KV_REST_API_TOKEN,
    });
    console.log(await redis.get('foo'));

    const rawEvents = await (await fetch(`${import.meta.env.VITE_SERVER_URL}/events`)).json();
    const events = rawEvents.map((event: Event) => ({...event, date: new Date(event.date)})) as Event[];
    events.sort((a, b) => (a.date < b.date ? -1 : 1));

    setEvents(events);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return [
    null === events ? null : (events.filter(event => undefined === type || type === event.type) as T[]),
    fetchEvents,
  ];
};

export {useEvents};
