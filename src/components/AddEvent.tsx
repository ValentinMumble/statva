import {ChangeEvent, useState} from 'react';
import {HStack, IconButton, Input, Select, useToast} from '@chakra-ui/react';
import {FaPlus} from 'react-icons/fa';
import {useAthlete, useLabels} from '../hooks';
import {getGearEmoji, removeNull} from '../models';

const EVENT_TYPES = ['chain', 'battery', 'brake_pad'];

type AddEventProps = {
  onAddEvent: () => void;
};

const AddEvent = ({onAddEvent}: AddEventProps) => {
  const [type, setType] = useState<string>('chain');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [chain, setChain] = useState<string | null>(null);
  const [bike, setBike] = useState<string | null>(null);
  const athlete = useAthlete();
  const toast = useToast();
  const [label] = useLabels();

  const resetForm = () => {
    setChain(null);
    setBike(null);
  };

  const handleTypeChange = ({target}: ChangeEvent<HTMLSelectElement>) => {
    setType(target.value);
    resetForm();
  };

  const handleDateChange = ({target}: ChangeEvent<HTMLInputElement>) => setDate(target.value);
  const handleChainChange = ({target}: ChangeEvent<HTMLInputElement>) => setChain(target.value);
  const handleBikeChange = ({target}: ChangeEvent<HTMLSelectElement>) => setBike(target.value);

  const handleAdd = async () => {
    const event = {
      type,
      date,
      chain,
      bike,
    };

    await fetch(`${import.meta.env.VITE_SERVER_URL}/events`, {
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
      body: JSON.stringify(removeNull(event)),
    });

    toast({
      status: 'success',
      description: `Event added ${label(type)}`,
    });
    resetForm();
    onAddEvent();
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
    <HStack margin="20px 10px" gap="20px">
      <Input type="date" size="sm" value={date} onChange={handleDateChange} />
      <Select size="sm" value={type} onChange={handleTypeChange}>
        {EVENT_TYPES.map(type => (
          <option key={type} value={type}>
            {label(type)}
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
      <IconButton
        variant="ghost"
        aria-label="Add"
        isDisabled={!isFormValid()}
        icon={<FaPlus />}
        size="xs"
        onClick={handleAdd}
      />
    </HStack>
  );
};

export {AddEvent};
