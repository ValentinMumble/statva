import {Button, IconButton, Table} from '@chakra-ui/react';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  toaster,
} from '../components/ui';
import {FiMinus} from 'react-icons/fi';
import {isChainEvent, Event, isTireEvent} from '../models';
import {AddEvent} from '../components';
import {useEvents, useLabels} from '../hooks';

const HEADERS = ['Date', 'Type', 'Bike', 'Chain', ''];

type EditEventsProps = {
  onEditEvents: () => void;
};

const EditEvents = ({onEditEvents}: EditEventsProps) => {
  const [label] = useLabels();
  const [events, refreshEvents] = useEvents();

  const refresh = () => {
    onEditEvents();
    refreshEvents();
  };

  const handleRemove = (event: Event) => async () => {
    await fetch(`${import.meta.env.VITE_SERVER_URL}/events/${event.id}`, {method: 'DELETE'});
    refresh();

    toaster.create({title: `${label(event.type)} Event removed`});
  };

  return (
    <DialogRoot size="xl">
      <DialogTrigger asChild={true}>
        <Button variant="ghost" size="sm" title="Edit events">
          🪭
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogCloseTrigger />
        <DialogHeader>
          <DialogTitle>Events</DialogTitle>
        </DialogHeader>
        <DialogBody display="flex" flexDirection="column" gap="20px">
          <AddEvent onAddEvent={refresh} />
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                {HEADERS.map(header => (
                  <Table.ColumnHeader key={header}>{header}</Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {events.reverse().map(event => (
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
                    <IconButton variant="ghost" title="Remove event" size="xs" onClick={handleRemove(event)}>
                      <FiMinus />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};

export {EditEvents};
