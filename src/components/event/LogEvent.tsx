import {ReactNode, useState} from 'react';
import {Button, Dialog, Grid, Group, HStack, Input, Portal, Stack, Text} from '@chakra-ui/react';
import {toaster} from '../../components/ui';
import {EventForm, GearSelect} from '../../components';
import {useActivities, useEvents, useLabels} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {
  Event,
  formatDistance,
  isChainEvent,
  isEventValid,
  recentFittings,
  REFITTED_PARTS,
  suggestChains,
  SUPER6,
} from '../../models';

const upsertEvent = getFetcher<void>('events.set');
const deleteEvent = getFetcher<void>('events.delete');

// Ordered by how often they get logged.
const EVENT_TYPES: Event['type'][] = [
  'chain',
  'puncture',
  'battery',
  'tire',
  'cassette',
  'brake_pad',
  'brake_bleed',
  'saddle',
  'fall',
];

const toInputDate = (date: Date): string => date.toISOString().slice(0, 10);

// The part itself, without when or where it was fitted.
const IDENTITY_KEYS = ['id', 'date', 'bike'];

const partOf = (event: Event): Partial<Event> =>
  Object.fromEntries(Object.entries(event).filter(([key]) => !IDENTITY_KEYS.includes(key))) as Partial<Event>;

type LogEventProps = {
  bike?: string;
  onLogged: () => void;
  trigger: ReactNode;
};

/**
 * Logging in two steps: pick what happened, then confirm. The date, the bike and the
 * part are already filled in, so the common events are two taps and nothing typed.
 */
const LogEvent = ({bike = SUPER6, onLogged, trigger}: LogEventProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Event>>({});
  const [withFields, setWithFields] = useState(false);
  const {label} = useLabels();
  const {events, refetch: refreshEvents} = useEvents();
  const {activities} = useActivities({withCommute: true, withPrivate: true, gearId: draft.bike ?? bike});

  const reset = () => {
    setDraft({});
    setWithFields(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

  const handleTypeChoice = (type: Event['type']) => () => {
    const [suggested] = 'chain' === type ? suggestChains(events, activities ?? [], bike) : [];

    setDraft({type, date: new Date(), bike, ...(undefined === suggested ? {} : {chain: suggested.chain})});
    setWithFields(false);
  };

  const handleLog = async () => {
    const event = {id: self.crypto.randomUUID(), ...draft} as Event;

    await upsertEvent(event);
    refreshEvents();
    onLogged();
    handleOpenChange(false);

    toaster.create({
      title: `${label(event.type)} logged on ${event.date.toLocaleDateString('fr-FR')}`,
      action: {
        label: 'Undo',
        onClick: async () => {
          await deleteEvent(event.id);
          refreshEvents();
          onLogged();
        },
      },
    });
  };

  const chains = 'chain' === draft.type ? suggestChains(events, activities ?? [], draft.bike ?? bike) : [];
  const chosenChain = isChainEvent(draft) ? draft.chain : undefined;
  const fittings =
    undefined !== draft.type && REFITTED_PARTS.includes(draft.type)
      ? recentFittings(events, draft.type, draft.bike ?? bike, label)
      : [];
  const needsFields = 0 === fittings.length || withFields;

  return (
    <Dialog.Root open={open} onOpenChange={({open}) => handleOpenChange(open)} size="sm">
      <Dialog.Trigger asChild={true}>{trigger}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {undefined === draft.type ? 'What happened?' : `${label(draft.type)} ${draft.type.replace('_', ' ')}`}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {undefined === draft.type ? (
                <Grid templateColumns="repeat(3, 1fr)" gap="8px">
                  {EVENT_TYPES.map(type => (
                    <Button key={type} variant="outline" height="64px" onClick={handleTypeChoice(type)}>
                      <Stack gap="2px" alignItems="center">
                        <Text fontSize="xl">{label(type)}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {type.replace('_', ' ')}
                        </Text>
                      </Stack>
                    </Button>
                  ))}
                </Grid>
              ) : (
                <Stack gap="14px">
                  <HStack gap="8px">
                    <Input
                      type="date"
                      size="sm"
                      width="150px"
                      value={draft.date ? toInputDate(draft.date) : ''}
                      onChange={({target}) => setDraft(draft => ({...draft, date: new Date(target.value)}))}
                    />
                    <GearSelect
                      size="sm"
                      selectedGear={draft.bike ? [draft.bike] : []}
                      excludedGearTypes={['shoes']}
                      onSelectedGearChange={([bike]) => setDraft(draft => ({...draft, bike}))}
                      portalled={false}
                    />
                  </HStack>

                  {0 < chains.length && (
                    <Stack gap="6px">
                      <Text fontSize="xs" color="fg.muted">
                        Which chain · least used first
                      </Text>
                      <Group flexWrap="wrap" gap="6px">
                        {chains.map(({chain, distance}) => (
                          <Button
                            key={chain}
                            size="xs"
                            variant={chain === chosenChain ? 'surface' : 'outline'}
                            onClick={() => setDraft(draft => ({...draft, chain}))}
                          >
                            {chain} {formatDistance(distance)}
                          </Button>
                        ))}
                      </Group>
                    </Stack>
                  )}

                  {0 < fittings.length && (
                    <Stack gap="6px">
                      <Text fontSize="xs" color="fg.muted">
                        Fit the same as before
                      </Text>
                      <Group flexWrap="wrap" gap="6px">
                        {fittings.map(({event, detail}) => (
                          <Button
                            key={event.id}
                            size="xs"
                            variant={withFields ? 'outline' : 'surface'}
                            onClick={() => {
                              setDraft(draft => ({...draft, ...partOf(event)}));
                              setWithFields(false);
                            }}
                          >
                            {detail}
                          </Button>
                        ))}
                        <Button size="xs" variant="ghost" onClick={() => setWithFields(true)}>
                          Something else…
                        </Button>
                      </Group>
                    </Stack>
                  )}

                  {needsFields && (
                    <Group flexWrap="wrap" gap="8px">
                      <EventForm event={draft} onChange={setDraft} />
                    </Group>
                  )}
                </Stack>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              {undefined !== draft.type && (
                <>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Back
                  </Button>
                  <Button size="sm" disabled={!isEventValid(draft)} onClick={handleLog}>
                    Log it
                  </Button>
                </>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export {LogEvent};
