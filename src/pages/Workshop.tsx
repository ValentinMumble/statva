import {Button, Clipboard, Heading, HStack, IconButton, Stack, Table, Text} from '@chakra-ui/react';
import {LuMinus} from 'react-icons/lu';
import {toaster} from '../components/ui';
import {BikeParts, EventCells, LogEvent, PageTitle, TopBar, TOP_BAR_HEIGHT} from '../components';
import {useEvents, useLabels} from '../hooks';
import {getFetcher} from '../hooks/useFetcher';
import {backup, Event} from '../models';

const deleteEvent = getFetcher<void>('events.delete');

const HEADERS = ['Date', 'Bike', 'Type', 'Fitted', ''];

/** Everything about keeping the bikes running: what is on them, and what has been done. */
const Workshop = () => {
  const {label} = useLabels();
  const {events, refetch: refreshEvents} = useEvents();

  const handleRemove = (event: Event) => async () => {
    await deleteEvent(event.id);
    refreshEvents();

    toaster.create({title: `${label(event.type)} removed`});
  };

  return (
    <>
      <PageTitle title="Statva workshop 🪭" />
      <TopBar />
      <Stack
        padding={{base: '16px', md: '24px'}}
        paddingBottom={{base: `calc(16px + ${TOP_BAR_HEIGHT})`, md: '24px'}}
        gap="24px"
        maxWidth="1100px"
        margin="0 auto"
      >
        <HStack justifyContent="space-between" alignItems="baseline" gap="12px" flexWrap="wrap">
          <Heading size="lg">Workshop 🪭</Heading>
          <HStack gap="8px">
            <Clipboard.Root value={backup(events)}>
              <Clipboard.Trigger asChild={true}>
                <Button size="sm" variant="outline">
                  <Clipboard.Indicator />
                  Backup
                </Button>
              </Clipboard.Trigger>
            </Clipboard.Root>
            <LogEvent
              onLogged={refreshEvents}
              trigger={
                <Button size="sm" variant="surface">
                  Log
                </Button>
              }
            />
          </HStack>
        </HStack>

        <BikeParts />

        <Stack gap="8px">
          <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.1em" color="fg.muted">
            {events.length} events
          </Text>
          <Table.ScrollArea>
            <Table.Root size="sm" stickyHeader={true}>
              <Table.Header>
                <Table.Row>
                  {HEADERS.map(header => (
                    <Table.ColumnHeader key={header}>{header}</Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {[...events].reverse().map(event => (
                  <Table.Row key={event.id}>
                    <Table.Cell whiteSpace="nowrap">{event.date.toLocaleDateString('fr-FR')}</Table.Cell>
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
          </Table.ScrollArea>
        </Stack>
      </Stack>
    </>
  );
};

export {Workshop};
