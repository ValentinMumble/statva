import {Button, IconButton, Table} from '@chakra-ui/react';
import {LuMinus} from 'react-icons/lu';
import {
  ClipboardButton,
  ClipboardRoot,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  toaster,
} from '../../components/ui';
import {Event, backup} from '../../models';
import {AddEvent, EventCells} from '../../components';
import {useEvents, useFetcher, useLabels} from '../../hooks';

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
  const deleteEvent = useFetcher<void>('events.delete');

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
        <DialogHeader display="flex" alignItems="center" justifyContent="space-between">
          <DialogTitle>{events?.length ?? 0} events 🪭</DialogTitle>
          <ClipboardRoot value={backup(events ?? [])}>
            <ClipboardButton text="Backup" />
          </ClipboardRoot>
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
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};

export {EditEvents};
