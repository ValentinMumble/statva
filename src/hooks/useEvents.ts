import {useEffect, useState} from 'react';

type Event = {
  type: string;
  chain: string; //TODO
  date: Date;
};

const useEvents = (type?: string) => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const events = await (await fetch('/events.json')).json();

      setEvents(events.map((event: Event) => ({...event, date: new Date(event.date)})));
    };

    fetchEvents();
  }, []);

  return events.filter(event => undefined === type || type === event.type);
};

export {useEvents};
