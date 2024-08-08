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

const useEvents = <T>(type?: string) => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const events = await (await fetch('/events.json')).json();

      setEvents(events.map((event: Event) => ({...event, date: new Date(event.date)})));
    };

    fetchEvents();
  }, []);

  return events.filter(event => undefined === type || type === event.type) as T[];
};

export {useEvents};
export type {BatteryEvent, ChainEvent, TireEvent};