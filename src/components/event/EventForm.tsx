import {Event} from '../../models';
import {CassetteEventForm, ChainEventForm, FallEventForm, SaddleEventForm, TireEventForm} from '../event';

type EventFormProps<EventType> = {
  event: Partial<EventType>;
  onChange: (event: Partial<EventType>) => void;
};

const EventForm = ({event, ...props}: EventFormProps<Event>) => {
  switch (event.type) {
    case 'chain':
      return <ChainEventForm {...props} event={event} />;
    case 'cassette':
      return <CassetteEventForm {...props} event={event} />;
    case 'tire':
      return <TireEventForm {...props} event={event} />;
    case 'saddle':
      return <SaddleEventForm {...props} event={event} />;
    case 'fall':
      return <FallEventForm {...props} event={event} />;
    default:
      return null;
  }
};

export type {EventFormProps};
export {EventForm};
