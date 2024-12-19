import {Event} from '../../models';
import {CassetteEventForm, ChainEventForm, SaddleEventForm, TireEventForm} from '../event';

type EventFormProps = {
  event: Partial<Event>;
  onChange: (event: Partial<Event>) => void;
};

const EventForm = (props: EventFormProps) => {
  switch (props.event.type) {
    case 'chain':
      return <ChainEventForm {...props} />;
    case 'cassette':
      return <CassetteEventForm {...props} />;
    case 'tire':
      return <TireEventForm {...props} />;
    case 'saddle':
      return <SaddleEventForm {...props} />;
    default:
      return null;
  }
};

export type {EventFormProps};
export {EventForm};
