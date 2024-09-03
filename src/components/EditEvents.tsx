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
import {isChainEvent, Event} from '../models';
import {AddEvent} from './AddEvent';
import {useEvents} from '../hooks';

type EditEventsProps = {
  events: Event[];
  onEditEvents: () => void;
};

const EditEvents = ({onEditEvents}: EditEventsProps) => {
  const {isOpen, onOpen, onClose} = useDisclosure();
  const toast = useToast();
  const [events, refreshEvents] = useEvents();
  events.reverse();

  const refresh = () => {
    onEditEvents();
    refreshEvents();
  };

  const handleRemove = (id: string) => async () => {
    await fetch(`https://vumble.dev:3002/statva/events/${id}`, {method: 'DELETE'});
    refresh();

    toast({
      status: 'success',
      description: 'Event removed',
    });
  };

  return (
    <>
      <Button size="sm" onClick={onOpen}>
        Edit events
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalBody>
            <AddEvent onAddEvent={refresh} />
            <Table size="sm" variant="striped">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Chain</Th>
                </Tr>
              </Thead>
              <Tbody>
                {events.map(event => (
                  <Tr key={event.id}>
                    <Td>{event.date.toLocaleDateString()}</Td>
                    <Td>{event.type}</Td>
                    {isChainEvent(event) ? (
                      <>
                        <Td>{event.chain}</Td>
                      </>
                    ) : (
                      <Td />
                    )}
                    <Td textAlign="end">
                      <IconButton aria-label="Remove" icon={<FaMinus />} size="xs" onClick={handleRemove(event.id)} />
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
