import {useState} from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  Field,
  HStack,
  Input,
  Link as ChakraLink,
  NativeSelect,
  Portal,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import {useQueryClient} from '@tanstack/react-query';
import {Link} from 'react-router';
import {LuExternalLink} from 'react-icons/lu';
import {UploadRefusedError, NoWriteAccessError} from '../../api';
import {useGear, useLabels, useSettings} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {isPedalled, MergeChoice, MergePart, mergePlan, MergeResult, PendingMerge} from '../../models';
import {Activity} from '../../models/strava';
import {duration, km} from '../format';

const mergeActivities = getFetcher<MergeResult>('activities.merge');
const retryMerge = getFetcher<MergeResult>('activities.merge.retry');
const discardMerge = getFetcher<void>('activities.merge.discard');

// Strava's own limit on an activity name.
const MAX_NAME_LENGTH = 255;

type Step =
  | {kind: 'form'}
  | {kind: 'working'}
  // The parts still to delete on Strava: none after a retry, the rider deleted them first.
  | {kind: 'merged'; activity: Activity | null; parts: MergePart[]}
  | {kind: 'refused'; pending: PendingMerge};

const stravaUrl = (id: number): string => `https://www.strava.com/activities/${id}`;

const timeOf = (start: string, locale: string): string =>
  new Date(start).toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'});

/** The parts, each a link to delete it on Strava: the API cannot. */
const PartsToDelete = ({parts, locale}: {parts: MergePart[]; locale: string}) => (
  <Stack gap="6px">
    <Text fontSize="sm">Delete the parts on Strava (Statva cannot):</Text>
    {parts.map(({id, name, start_date}) => (
      <ChakraLink key={id} href={stravaUrl(id)} target="_blank" rel="noreferrer" fontSize="sm" color="brand.fg">
        {name} · {timeOf(start_date, locale)} <LuExternalLink />
      </ChakraLink>
    ))}
  </Stack>
);

type MergeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // A new merge of these activities, or the merge Strava refused, waiting for its parts to go.
  activities?: Activity[];
  pending?: PendingMerge | null;
  onDone: () => void;
};

/**
 * Merges activities recorded in parts into one, on Strava: the rider names it, picks the gear
 * and the commute flag, and deletes the parts on Strava afterwards. When Strava refuses it (a
 * duplicate of a part), it waits for the parts to be deleted and goes up again.
 */
const MergeDialog = ({open, onOpenChange, activities = [], pending = null, onDone}: MergeDialogProps) => {
  const queryClient = useQueryClient();
  const {locale} = useSettings();
  const {label} = useLabels();
  const gear = useGear();
  const plan = mergePlan(activities);
  const [first] = plan.parts;
  const [step, setStep] = useState<Step>(null === pending ? {kind: 'form'} : {kind: 'refused', pending});
  const [name, setName] = useState(first?.name ?? '');
  const [gearId, setGearId] = useState(first?.gear_id ?? '');
  const [commute, setCommute] = useState(first?.commute ?? false);
  const [error, setError] = useState<string | null>(null);
  const sport = first?.sport_type ?? '';
  const gearType = isPedalled(sport) ? 'bike' : /Run|Walk|Hike/.test(sport) ? 'shoes' : null;
  const options = gear.filter(item => item.type === gearType && (!item.retired || item.id === gearId));

  const handle = async (send: () => Promise<MergeResult>, parts: MergePart[]) => {
    setStep({kind: 'working'});
    setError(null);
    try {
      const result = await send();
      if ('refused' === result.outcome) {
        setStep({kind: 'refused', pending: result.pending});
      } else {
        const merged = 'merged' === result.outcome ? result.activity : null;
        if (null !== merged) {
          queryClient.setQueryData<Activity[]>(['activities'], list => (list ? [...list, merged] : list));
          queryClient.setQueryData<Record<string, Activity>>(['activityMeta'], loaded =>
            loaded ? {...loaded, [merged.id]: merged} : loaded,
          );
        }
        setStep({kind: 'merged', activity: merged, parts});
      }
    } catch (failure) {
      setError(
        failure instanceof NoWriteAccessError
          ? 'Log out and in again to let Statva upload to Strava'
          : failure instanceof UploadRefusedError
            ? failure.message
            : 'Strava could not be reached: try again',
      );
      setStep(null === pending ? {kind: 'form'} : {kind: 'refused', pending});
    }
    await queryClient.invalidateQueries({queryKey: ['pendingMerge']});
  };

  const merge = () =>
    handle(
      () =>
        mergeActivities({
          ids: plan.parts.map(({id}) => id),
          name: name.trim(),
          gearId: gearId || 'none',
          commute,
        } satisfies MergeChoice),
      plan.parts,
    );

  const forget = async () => {
    await discardMerge();
    await queryClient.invalidateQueries({queryKey: ['pendingMerge']});
    onOpenChange(false);
  };

  const close = () => {
    onOpenChange(false);
    if ('merged' === step.kind) onDone();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({open: isOpen}) => (isOpen ? onOpenChange(true) : close())}
      size="sm"
      placement={{base: 'bottom', md: 'center'}}
      closeOnInteractOutside={'working' !== step.kind}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content marginBottom={{base: '0', md: 'auto'}} borderBottomRadius={{base: '0', md: 'l3'}}>
            <Dialog.Header>
              <Dialog.Title>
                {'merged' === step.kind
                  ? 'Merged'
                  : 'refused' === step.kind
                    ? 'Merge waiting'
                    : `Merge ${plan.parts.length} activities`}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {'form' === step.kind && (
                <Stack gap="16px">
                  <Stack gap="4px" fontSize="sm">
                    {plan.parts.map(part => (
                      <HStack key={part.id} justifyContent="space-between" gap="12px">
                        <Text truncate={true}>
                          {timeOf(part.start_date, locale)} · {part.name}
                        </Text>
                        <Text fontFamily="figure" flexShrink={0}>
                          {0 < part.distance ? km(part.distance, locale) : duration(part.moving_time)}
                        </Text>
                      </HStack>
                    ))}
                    <Text color="fg.muted">
                      {km(plan.distance, locale)} · {duration(plan.movingTime)} moving
                      {0 < plan.gaps.length && !plan.overlaps
                        ? ` · stops of ${plan.gaps.map(gap => duration(gap)).join(', ')}`
                        : ''}
                    </Text>
                  </Stack>
                  {plan.overlaps && (
                    <Text fontSize="sm" color="fg.error">
                      Some of these overlap in time: they were recorded twice, not in parts.
                    </Text>
                  )}
                  {plan.mixedSports && (
                    <Text fontSize="sm" color="fg.muted">
                      They are of different sports: the merge is a {sport}, like the first.
                    </Text>
                  )}
                  <Field.Root>
                    <Field.Label>Name</Field.Label>
                    <Input value={name} maxLength={MAX_NAME_LENGTH} onChange={({target}) => setName(target.value)} />
                  </Field.Root>
                  {null !== gearType && (
                    <Field.Root>
                      <Field.Label>{'bike' === gearType ? 'Bike' : 'Shoes'}</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field value={gearId} onChange={({target}) => setGearId(target.value)}>
                          <option value="">{'bike' === gearType ? 'No bike' : 'No shoes'}</option>
                          {options.map(item => (
                            <option key={item.id} value={item.id}>
                              {label(item.id) === item.id ? item.name : label(item.id)}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                  )}
                  <Checkbox.Root checked={commute} onCheckedChange={({checked}) => setCommute(true === checked)}>
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>Commute</Checkbox.Label>
                  </Checkbox.Root>
                  {null !== error && (
                    <Text fontSize="sm" color="fg.error">
                      {error}
                    </Text>
                  )}
                </Stack>
              )}

              {'working' === step.kind && (
                <HStack gap="10px" paddingY="12px">
                  <Spinner size="sm" />
                  <Text fontSize="sm">Joining the parts and uploading to Strava. It can take up to a minute.</Text>
                </HStack>
              )}

              {'merged' === step.kind && (
                <Stack gap="16px">
                  {null === step.activity ? (
                    <Text fontSize="sm">
                      Strava took it and is still working on it: it shows up in a minute. Check its gear on its page
                      then.
                    </Text>
                  ) : (
                    <Button asChild={true} variant="surface" size="sm" alignSelf="flex-start" onClick={close}>
                      <Link to={`/activities/${step.activity.id}`}>Open {step.activity.name}</Link>
                    </Button>
                  )}
                  {0 < step.parts.length && <PartsToDelete parts={step.parts} locale={locale} />}
                </Stack>
              )}

              {'refused' === step.kind && (
                <Stack gap="16px">
                  <Text fontSize="sm">
                    Strava refused <b>{step.pending.name}</b>: “{step.pending.error}”. Statva kept it: delete the parts,
                    then upload it again.
                  </Text>
                  <PartsToDelete parts={step.pending.parts} locale={locale} />
                  {null !== error && (
                    <Text fontSize="sm" color="fg.error">
                      {error}
                    </Text>
                  )}
                </Stack>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              {'form' === step.kind && (
                <>
                  <Button variant="ghost" onClick={close}>
                    Cancel
                  </Button>
                  <Button
                    colorPalette="brand"
                    disabled={plan.overlaps || '' === name.trim() || plan.parts.length < 2}
                    onClick={merge}
                  >
                    Merge and upload
                  </Button>
                </>
              )}
              {'merged' === step.kind && <Button onClick={close}>Done</Button>}
              {'refused' === step.kind && (
                <>
                  <Button variant="ghost" onClick={forget}>
                    Forget it
                  </Button>
                  <Button colorPalette="brand" onClick={() => handle(retryMerge, [])}>
                    Upload again
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

export {MergeDialog};
