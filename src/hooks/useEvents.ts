import {useQuery} from '@tanstack/react-query';
import {Event} from '../models';
import {getFetcher} from './useFetcher';

const getEvents = getFetcher<Event[]>('events.get');

const useEvents = <T extends Event>(type?: string) => {
  const {data: events = null, refetch} = useQuery({
    queryKey: ['events'],
    queryFn: getEvents,
  });

  return {
    events: null === events
      ? null
      : (events.filter(event => undefined === type || type === event.type) as T[]).sort((a, b) =>
          a.date < b.date ? -1 : 1
        ),
    refetch: () => { refetch(); },
  };
};

export {useEvents};
