import {ChangeEvent, useState} from 'react';
import {Group, IconButton, Input, Select, SelectValueChangeDetails} from '@chakra-ui/react';
import {LuPlus} from 'react-icons/lu';
import {toaster} from '../../components/ui';
import {EventForm, GearSelect} from '../../components';
import {useFetcher, useLabels} from '../../hooks';
import {Event, isEventValid, labelCollection, SUPER6} from '../../models';

const EVENT_TYPES: Event['type'][] = [
  'chain',
  'cassette',
  'tire',
  'saddle',
  'battery',
  'brake_pad',
  'fall',
  'puncture',
];

type AddEventProps = {
  onAddEvent: () => void;
};

const AddEvent = ({onAddEvent}: AddEventProps) => {
  const [event, setEvent] = useState<Partial<Event>>({type: 'chain', date: new Date(), bike: SUPER6});
  const [label] = useLabels();
  const upsertEvent = useFetcher<void>('events.set');

  const handleTypeChange = ({value}: SelectValueChangeDetails) =>
    setEvent(event => ({date: event.date, bike: event.bike, type: value[0] as Event['type']}));

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

  const typeCollection = labelCollection(EVENT_TYPES, label);

  return (
    <Group justifyContent="space-between">
      <Input
        type="date"
        size="sm"
        width="200px"
        value={event.date?.toISOString().slice(0, 10)}
        onChange={handleDateChange}
      />
      <GearSelect
        size="sm"
        selectedGear={event.bike ? [event.bike] : []}
        excludedGearTypes={['shoes']}
        onSelectedGearChange={([bike]) => setEvent({...event, bike})}
        portalled={false}
      />
      <Select.Root
        width="100px"
        value={[String(event.type)]}
        onValueChange={handleTypeChange}
        collection={typeCollection}
      >
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Type" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {typeCollection.items.map(type => (
              <Select.Item item={type} key={type.value}>
                {type.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
      <EventForm event={event} onChange={setEvent} />
      <IconButton variant="outline" title="Add event" disabled={!isEventValid(event)} size="xs" onClick={handleAdd}>
        <LuPlus />
      </IconButton>
    </Group>
  );
};

export {AddEvent};
