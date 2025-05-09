import {useEffect, useState} from 'react';
import {Event} from '../models';
import {useFetcher} from '../hooks';

const useEvents = <T extends Event>(type?: string): [T[] | null, () => void] => {
  const [events, setEvents] = useState<Event[] | null>(null);
  const getEvents = useFetcher<Event[]>('events.get');

  const fetchEvents = async () => setEvents(await getEvents());

  useEffect(() => {
    fetchEvents();
  }, [getEvents]);

  return [
    null === events
      ? null
      : (events.filter(event => undefined === type || type === event.type) as T[]).sort((a, b) =>
          a.date < b.date ? -1 : 1
        ),
    fetchEvents,
  ];
};

export {useEvents};
