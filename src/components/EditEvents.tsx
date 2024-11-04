import {Button, IconButton, Table, useDisclosure} from '@chakra-ui/react';
import {FaMinus} from 'react-icons/fa';
import {isChainEvent, Event, isTireEvent} from '../models';
import {AddEvent} from './AddEvent';
import {useEvents, useLabels} from '../hooks';
import {DialogBackdrop, DialogContent, DialogRoot} from '../components/ui';

type EditEventsProps = {
  events: Event[];
  onEditEvents: () => void;
};

const EditEvents = ({onEditEvents}: EditEventsProps) => {
  const {open, onOpen, onClose} = useDisclosure();
  const [label] = useLabels();
  const [events, refreshEvents] = useEvents();
  events.reverse();

  const refresh = () => {
    onEditEvents();
    refreshEvents();
  };

  const handleRemove = (id: string) => async () => {
    await fetch(`${import.meta.env.VITE_SERVER_URL}/events/${id}`, {method: 'DELETE'});
    refresh();

    //TODO
    // toast({
    //   status: 'success',
    //   description: 'Event removed',
    // });
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onOpen}>
        🪭
      </Button>
      <DialogRoot open={open} onOpenChange={onClose} size="xl">
        <DialogBackdrop />
        <DialogContent padding="20px" gap="20px">
          <AddEvent onAddEvent={refresh} />
          <Table.Root size="sm" striped={true}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Date</Table.ColumnHeader>
                <Table.ColumnHeader>Type</Table.ColumnHeader>
                <Table.ColumnHeader>Bike</Table.ColumnHeader>
                <Table.ColumnHeader>Chain</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {events.map(event => (
                <Table.Row key={event.id}>
                  <Table.Cell>{event.date.toLocaleDateString()}</Table.Cell>
                  <Table.Cell>{label(event.type)}</Table.Cell>
                  {isChainEvent(event) ? (
                    <>
                      <Table.Cell>{label(event.bike, true)}</Table.Cell>
                      <Table.Cell>{event.chain}</Table.Cell>
                    </>
                  ) : isTireEvent(event) ? (
                    <>
                      <Table.Cell>{event.model}</Table.Cell>
                      <Table.Cell>{event.width} mm</Table.Cell>
                    </>
                  ) : (
                    <>
                      <Table.Cell />
                      <Table.Cell />
                    </>
                  )}
                  <Table.Cell textAlign="end">
                    <IconButton variant="ghost" title="Remove" size="xs" onClick={handleRemove(event.id)}>
                      <FaMinus />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </DialogContent>
      </DialogRoot>
    </>
  );
};

export {EditEvents};
