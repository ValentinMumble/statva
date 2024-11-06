import {ChangeEvent, useState} from 'react';
import {Group, IconButton, Input, SegmentGroupValueChangeDetails} from '@chakra-ui/react';
import {LuPlus} from 'react-icons/lu';
import {SegmentedControl, toaster} from '../components/ui';
import {GearSelect} from '../components';
import {useLabels} from '../hooks';
import {Event, labelCollection, removeNull} from '../models';
import {addEvent} from '../redis';

const EVENT_TYPES = ['chain', 'battery', 'brake_pad'];

type AddEventProps = {
  onAddEvent: () => void;
};

const AddEvent = ({onAddEvent}: AddEventProps) => {
  const [type, setType] = useState<string>('chain');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [chain, setChain] = useState<string | null>(null);
  const [bike, setBike] = useState<string | null>(null);
  const [label] = useLabels();

  const resetForm = () => {
    setChain(null);
    setBike(null);
  };

  const handleTypeChange = ({value}: SegmentGroupValueChangeDetails) => {
    setType(value);
    resetForm();
  };

  const handleDateChange = ({target}: ChangeEvent<HTMLInputElement>) => setDate(target.value);
  const handleChainChange = ({target}: ChangeEvent<HTMLInputElement>) => setChain(target.value);
  const handleBikeChange = (bikes: string[]) => setBike(bikes[0]);

  const handleAdd = async () => {
    const event = removeNull({
      id: self.crypto.randomUUID(),
      type,
      date,
      chain,
      bike,
    }) as Event;

    await addEvent(event);
    resetForm();
    onAddEvent();

    toaster.create({title: `${label(event.type)} Event added`});
  };

  const isFormValid = (): boolean => {
    switch (type) {
      case 'chain':
        return null !== bike && null !== chain;
      case 'battery':
      default:
        return true;
    }
  };

  return (
    <Group justifyContent="space-between">
      <Input type="date" size="sm" width="200px" value={date} onChange={handleDateChange} />
      <SegmentedControl
        value={type}
        size="sm"
        onValueChange={handleTypeChange}
        items={labelCollection(EVENT_TYPES, label).items}
      />
      {'chain' === type && (
        <>
          <GearSelect
            size="sm"
            selectedGear={null === bike ? [] : [bike]}
            onSelectedGearChange={handleBikeChange}
            selectContentProps={{portalled: false}}
          />
          <Input size="sm" width="200px" placeholder="🔗" value={chain ?? ''} onChange={handleChainChange} />
        </>
      )}
      <IconButton variant="outline" title="Add event" disabled={!isFormValid()} size="xs" onClick={handleAdd}>
        <LuPlus />
      </IconButton>
    </Group>
  );
};

export {AddEvent};
