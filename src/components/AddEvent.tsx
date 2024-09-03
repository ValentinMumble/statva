import {ChangeEvent, useState} from 'react';
import {HStack, IconButton, Input, Select, useToast} from '@chakra-ui/react';
import {FaPlus} from 'react-icons/fa';
import {useAthlete} from '../hooks';
import {getGearEmoji, removeNull} from '../models';

const EVENT_TYPES = ['chain', 'battery', 'tire'];

type AddEventProps = {
  onAddEvent: () => void;
};

const AddEvent = ({onAddEvent}: AddEventProps) => {
  const [type, setType] = useState<string>('chain');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [chain, setChain] = useState<string | null>(null);
  const [bike, setBike] = useState<string | null>(null);
  const [tire, setTire] = useState<string | null>(null);
  const athlete = useAthlete();
  const toast = useToast();

  const resetForm = () => {
    setChain(null);
    setBike(null);
    setTire(null);
  };

  const handleTypeChange = ({target}: ChangeEvent<HTMLSelectElement>) => {
    setType(target.value);
    resetForm();
  };

  const handleDateChange = ({target}: ChangeEvent<HTMLInputElement>) => setDate(target.value);
  const handleChainChange = ({target}: ChangeEvent<HTMLInputElement>) => setChain(target.value);
  const handleBikeChange = ({target}: ChangeEvent<HTMLSelectElement>) => setBike(target.value);
  const handleTireChange = ({target}: ChangeEvent<HTMLInputElement>) => setTire(target.value);

  const handleAdd = async () => {
    const event = {
      type,
      date,
      chain,
      bike,
      tire,
    };

    await fetch('https://vumble.dev:3002/statva/events', {
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
      body: JSON.stringify(removeNull(event)),
    });

    toast({
      status: 'success',
      description: `Event added ${chain}`,
    });
    resetForm();
    onAddEvent();
  };

  const isDisabled = () => {
    switch (type) {
      case 'chain':
        return null === bike || null === chain;
      case 'tire':
        return null === tire;
      case 'battery':
      default:
        return false;
    }
  };

  return (
    <HStack margin="20px 10px" gap="20px">
      <Input type="date" size="sm" value={date} onChange={handleDateChange} />
      <Select size="sm" value={type} onChange={handleTypeChange}>
        {EVENT_TYPES.map(type => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </Select>
      {'chain' === type && (
        <>
          <Select size="sm" placeholder="🚲" value={bike ?? ''} onChange={handleBikeChange}>
            {athlete?.bikes.map(({id}) => (
              <option key={id} value={id}>
                {getGearEmoji(athlete, id)}
              </option>
            ))}
          </Select>
          <Input size="sm" placeholder="🔗" value={chain ?? ''} onChange={handleChainChange} />
        </>
      )}
      {'tire' === type && <Input size="sm" placeholder="🛞" value={tire ?? ''} onChange={handleTireChange} />}
      <IconButton aria-label="Add" isDisabled={isDisabled()} icon={<FaPlus />} size="xs" onClick={handleAdd} />
    </HStack>
  );
};

export {AddEvent};
