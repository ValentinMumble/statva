import {useEffect, useState} from 'react';
import {Event} from '../models';
import {getEvents} from '../redis';

const useEvents = <T extends Event>(type?: string): [T[] | null, () => void] => {
  const [events, setEvents] = useState<Event[] | null>(null);

  const fetchEvents = async () => setEvents(await getEvents());

  useEffect(() => {
    fetchEvents();
  }, []);

  return [
    null === events ? null : (events.filter(event => undefined === type || type === event.type) as T[]),
    fetchEvents,
  ];
};

export {useEvents};
