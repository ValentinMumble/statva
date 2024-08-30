import {useEffect, useState} from 'react';

type Event = {
  type: string;
  date: Date;
};

type ChainEvent = Event & {
  chain: string;
  bike: string;
};

type TireEvent = Event & {
  tire: string;
};

type BatteryEvent = Event & {};

const useEvents = <T>(type?: string): [T[], () => void] => {
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
export type {BatteryEvent, ChainEvent, TireEvent};