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
import {LuMinus} from 'react-icons/lu';
import {isChainEvent, Event, isTireEvent} from '../models';
import {AddEvent} from '../components';
import {useEvents, useLabels} from '../hooks';
import {deleteEvent} from '../redis';

const HEADERS = ['Date', 'Type', 'Bike', 'Chain', ''];

const rowProps: Partial<Table.RowProps> = {
  width: '100%',
  display: 'table',
  tableLayout: 'fixed',
};

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
    await deleteEvent(event.id);
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
          <DialogTitle>{events?.length ?? 0} events 🪭</DialogTitle>
        </DialogHeader>
        <DialogBody display="flex" flexDirection="column" gap="20px">
          <AddEvent onAddEvent={refresh} />
          <Table.Root size="sm" display="block" height="70vh" overflow="scroll">
            <Table.Header position="sticky" top={0} zIndex={-1}>
              <Table.Row {...rowProps}>
                {HEADERS.map(header => (
                  <Table.ColumnHeader key={header}>{header}</Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(events ?? []).reverse().map(event => (
                <Table.Row key={event.id} {...rowProps}>
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
                      <LuMinus />
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
