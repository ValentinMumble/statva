import {useEffect, useState} from 'react';
import {Event} from '../models';

const useEvents = <T extends Event>(type?: string): [T[], () => void] => {
  const [events, setEvents] = useState<Event[]>([]);

  const fetchEvents = async () => {
    const rawEvents = await (await fetch(`${import.meta.env.VITE_SERVER_URL}/events`)).json();

    const events = rawEvents.map((event: Event) => ({...event, date: new Date(event.date)})) as Event[];
    events.sort((a, b) => (a.date < b.date ? -1 : 1));

    setEvents(events);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return [events.filter(event => undefined === type || type === event.type) as T[], fetchEvents];
};

export {useEvents};
