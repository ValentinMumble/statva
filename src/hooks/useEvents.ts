import {useEffect, useState} from 'react';
import {Event} from '../models';

const useEvents = <T extends Event>(type?: string): [T[], () => void] => {
  const [events, setEvents] = useState<Event[]>([]);

  const fetchEvents = async () => {
    //TODO env var for server URL?
    const events = await (await fetch('https://vumble.dev:3002/statva/events')).json();

    setEvents(events.map((event: Event) => ({...event, date: new Date(event.date)})));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return [events.filter(event => undefined === type || type === event.type) as T[], fetchEvents];
};

export {useEvents};
