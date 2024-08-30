import {ChangeEvent, useState} from 'react';
import {Button, HStack, Input, Select, useToast} from '@chakra-ui/react';
import {useAthlete} from '../hooks';
import {getGearEmoji} from '../models';

type AddEventProps = {
  onAddEvent: () => void;
};

const AddEvent = ({onAddEvent}: AddEventProps) => {
  const [chain, setChain] = useState<string>('');
  const [bike, setBike] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const athlete = useAthlete();
  const toast = useToast();

  const handleChainChange = ({target}: ChangeEvent<HTMLInputElement>) => setChain(target.value);
  const handleDateChange = ({target}: ChangeEvent<HTMLInputElement>) => setDate(target.value);
  const handleBikeChange = ({target}: ChangeEvent<HTMLSelectElement>) => setBike(target.value);

  const handleAdd = async () => {
    const event = {
      type: 'chain',
      date,
      chain,
      bike,
    };

    await fetch('https://vumble.dev:3002/statva/events', {
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
      body: JSON.stringify(event),
    });

    toast({
      status: 'success',
      description: `Event added ${chain}`,
    });
    setChain('');
    onAddEvent();
  };

  return (
    <HStack margin="0 10px 25px" gap="15px">
      <Select flex={2} size="sm" placeholder="🚲" value={bike} onChange={handleBikeChange}>
        {athlete?.bikes.map(({id}) => (
          <option key={id} value={id}>
            {getGearEmoji(athlete, id)}
          </option>
        ))}
      </Select>
      <Input flex={2} placeholder="🔗" size="sm" value={chain} onChange={handleChainChange} />
      <Input flex={2} type="date" size="sm" value={date} onChange={handleDateChange} />
      <Button flex={1} isDisabled={'' === bike || '' === chain || '' === date} size="sm" onClick={handleAdd}>
        Add
      </Button>
    </HStack>
  );
};

export {AddEvent};
