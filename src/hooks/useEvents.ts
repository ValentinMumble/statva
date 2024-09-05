import {useEffect, useState} from 'react';
import {Event} from '../models';

const useEvents = <T extends Event>(type?: string): [T[], () => void] => {
  const [events, setEvents] = useState<Event[]>([]);

  const fetchEvents = async () => {
    const events = await (await fetch(`${import.meta.env.VITE_SERVER_URL}/events`)).json();

    setEvents(events.map((event: Event) => ({...event, date: new Date(event.date)})));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return [events.filter(event => undefined === type || type === event.type) as T[], fetchEvents];
};

export {useEvents};
