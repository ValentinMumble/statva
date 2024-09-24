import {
  Button,
  IconButton,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import {FaMinus} from 'react-icons/fa';
import {isChainEvent, Event, isTireEvent, getGearEmoji} from '../models';
import {AddEvent} from './AddEvent';
import {useAthlete, useEvents, useLabels} from '../hooks';

type EditEventsProps = {
  events: Event[];
  onEditEvents: () => void;
};

const EditEvents = ({onEditEvents}: EditEventsProps) => {
  const {isOpen, onOpen, onClose} = useDisclosure();
  const toast = useToast();
  const [label] = useLabels();
  const athlete = useAthlete();
  const [events, refreshEvents] = useEvents();
  events.reverse();

  const refresh = () => {
    onEditEvents();
    refreshEvents();
  };

  const handleRemove = (id: string) => async () => {
    await fetch(`${import.meta.env.VITE_SERVER_URL}/events/${id}`, {method: 'DELETE'});
    refresh();

    toast({
      status: 'success',
      description: 'Event removed',
    });
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onOpen}>
        🪭
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalBody>
            <AddEvent onAddEvent={refresh} />
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Bike</Th>
                  <Th>Chain</Th>
                </Tr>
              </Thead>
              <Tbody>
                {events.map(event => (
                  <Tr key={event.id}>
                    <Td>{event.date.toLocaleDateString()}</Td>
                    <Td>{label(event.type)}</Td>
                    {isChainEvent(event) ? (
                      <>
                        <Td>{getGearEmoji(athlete, event.bike)}</Td>
                        <Td>{event.chain}</Td>
                      </>
                    ) : isTireEvent(event) ? (
                      <>
                        <Td>{event.model}</Td>
                        <Td>{event.width} mm</Td>
                      </>
                    ) : (
                      <>
                        <Td />
                        <Td />
                      </>
                    )}
                    <Td textAlign="end">
                      <IconButton
                        variant="ghost"
                        aria-label="Remove"
                        icon={<FaMinus />}
                        size="xs"
                        onClick={handleRemove(event.id)}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export {EditEvents};
