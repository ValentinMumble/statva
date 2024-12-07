import {FC} from 'react';
import {Event} from '../../models';
import {CassetteEventForm, ChainEventForm} from '../event';

type EventFormProps = {
  event: Partial<Event>;
  onChange: (event: Partial<Event>) => void;
};

const EVENT_FORMS: {[type: string]: FC<EventFormProps>} = {
  cassette: CassetteEventForm,
  chain: ChainEventForm,
};

export type {EventFormProps};
export {EVENT_FORMS};
