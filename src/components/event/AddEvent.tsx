import {ChangeEvent, useState} from 'react';
import {Group, IconButton, Input, SegmentGroupValueChangeDetails} from '@chakra-ui/react';
import {LuPlus} from 'react-icons/lu';
import {SegmentedControl, toaster} from '../../components/ui';
import {EventForm} from '../../components';
import {useFetcher, useLabels} from '../../hooks';
import {Event, isEventValid, labelCollection} from '../../models';

const EVENT_TYPES: Event['type'][] = ['chain', 'cassette', 'tire', 'battery', 'brake_pad'];

type AddEventProps = {
  onAddEvent: () => void;
};

const AddEvent = ({onAddEvent}: AddEventProps) => {
  const [event, setEvent] = useState<Partial<Event>>({type: 'chain', date: new Date()});
  const [label] = useLabels();
  const upsertEvent = useFetcher<void>('events.set');

  const handleTypeChange = ({value}: SegmentGroupValueChangeDetails) =>
    setEvent(event => ({date: event.date, type: value as Event['type']}));

  const handleDateChange = ({target}: ChangeEvent<HTMLInputElement>) =>
    setEvent(event => ({...event, date: new Date(target.value)}));

  const handleAdd = async () => {
    const eventWithId = {
      id: self.crypto.randomUUID(),
      ...event,
    } as Event;

    await upsertEvent(eventWithId);
    onAddEvent();
    setEvent({date: event.date, type: event.type});

    toaster.create({title: `${label(eventWithId.type)} Event added`});
  };

  return (
    <Group justifyContent="space-between">
      <Input
        type="date"
        size="sm"
        width="200px"
        value={event.date?.toISOString().slice(0, 10)}
        onChange={handleDateChange}
      />
      <SegmentedControl
        size="sm"
        value={event.type}
        onValueChange={handleTypeChange}
        items={labelCollection(EVENT_TYPES, label).items}
      />
      <EventForm event={event} onChange={setEvent} />
      <IconButton variant="outline" title="Add event" disabled={!isEventValid(event)} size="xs" onClick={handleAdd}>
        <LuPlus />
      </IconButton>
    </Group>
  );
};

export {AddEvent};
