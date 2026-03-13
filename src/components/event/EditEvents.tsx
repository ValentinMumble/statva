import {Button, IconButton, Table, Clipboard, Dialog, Portal} from '@chakra-ui/react';
import {LuMinus} from 'react-icons/lu';
import {toaster} from '../../components/ui';
import {Event, backup} from '../../models';
import {AddEvent, EventCells} from '../../components';
import {useEvents, useLabels} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';

const deleteEvent = getFetcher<void>('events.delete');

const HEADERS = ['Date', 'Bike', 'Type', 'Additional', '', ''];

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
    <Dialog.Root size="xl">
      <Dialog.Trigger asChild={true}>
        <Button variant="ghost" size="sm" title="Edit events">
          🪭
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header display="flex" alignItems="center" justifyContent="space-between">
              <Dialog.Title>{events?.length ?? 0} events 🪭</Dialog.Title>
              <Clipboard.Root value={backup(events ?? [])}>
                <Clipboard.Trigger asChild={true}>
                  <Button variant="outline">
                    <Clipboard.Indicator />
                    Backup
                  </Button>
                </Clipboard.Trigger>
              </Clipboard.Root>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" gap="20px">
              <AddEvent onAddEvent={refresh} />
              <Table.Root size="sm" display="block" height="70vh" overflow="scroll">
                <Table.Header position="sticky" top={0} zIndex={-1}>
                  <Table.Row {...rowProps}>
                    {HEADERS.map((header, index) => (
                      <Table.ColumnHeader key={index}>{header}</Table.ColumnHeader>
                    ))}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {(events ?? []).reverse().map(event => (
                    <Table.Row key={event.id} {...rowProps}>
                      <Table.Cell>{event.date.toLocaleDateString()}</Table.Cell>
                      <Table.Cell>{label(event.bike)}</Table.Cell>
                      <Table.Cell>{label(event.type)}</Table.Cell>
                      <EventCells event={event} />
                      <Table.Cell textAlign="end">
                        <IconButton variant="ghost" title="Remove event" size="xs" onClick={handleRemove(event)}>
                          <LuMinus />
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export {EditEvents};
