import {lazy, Suspense, useMemo, useState} from 'react';
import {Badge, Box, Button, Grid, HStack, IconButton, Input, Spinner, Stack, Switch, Text} from '@chakra-ui/react';
import {useNavigate, useParams} from 'react-router';
import {useQueryClient} from '@tanstack/react-query';
import {useLocalStorage} from 'usehooks-ts';
import {LuExternalLink, LuTrash2} from 'react-icons/lu';
import {LogEvent} from '../../components/event';
import {toaster} from '../../components/ui';
import {useAllActivities, useEvents, useExpenses, useGear, useLabels, useSettings} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {computeBikeParts, Event, getEventLabel, isTireEvent, partsCostPerKm, PartState, shoeWear, tyrePressure} from '../../models';
import {Card, CardTitle} from '../components/Card';
import {km, number, relativeDay} from '../format';

const ChainChart = lazy(async () => ({default: (await import('../../components/charts/ChainChart')).ChainChart}));
const EventOdometerChart = lazy(async () => ({default: (await import('../../components/charts/EventOdometerChart')).EventOdometerChart}));
const EventTimelineChart = lazy(async () => ({default: (await import('../../components/charts/EventTimelineChart')).EventTimelineChart}));
const CostPerKmChart = lazy(async () => ({default: (await import('../../components/charts/CostPerKmChart')).CostPerKmChart}));

const upsertEvent = getFetcher<void>('events.set');
const deleteEvent = getFetcher<void>('events.delete');

const PART_NAMES: Record<Event['type'], string> = {
  chain: 'Chain',
  tire: 'Tires',
  cassette: 'Cassette',
  brake_pad: 'Brake pads',
  brake_bleed: 'Brake fluid',
  battery: 'Battery',
  saddle: 'Saddle',
  puncture: 'Puncture',
  fall: 'Fall',
};

const STATE_COLOR: Record<PartState, string> = {ok: 'green.solid', due: 'orange.solid', overdue: 'red.solid'};

// Rounded to whole weeks: the pace it rests on is only a rough guide.
const weeksLeftText = (weeksLeft: number): string => {
  if (0 === weeksLeft) return 'due now';

  const weeks = Math.max(1, Math.round(weeksLeft));

  return `≈ ${weeks} ${1 === weeks ? 'week' : 'weeks'} left`;
};

// Euros per km read as cents, since a part costs a few cents per km at most.
const centsPerKm = (eurosPerKm: number, locale: string): string => `${number(eurosPerKm * 100, locale, 1)} c/km`;

const ChartCard = ({title, children}: {title: string; children: React.ReactNode}) => (
  <Card>
    <CardTitle>{title}</CardTitle>
    <Suspense fallback={<Spinner />}>{children}</Suspense>
  </Card>
);

const saveSetting = getFetcher<void>('settings.set');
// A second opinion, with surface and speed: it has no API, so its inputs are listed to type in.
const SILCA_CALCULATOR = 'https://silca.cc/pages/sppc-form';
const KG_PER_LB = 0.4536;

/** Front and rear pressure from Berto's 15% tyre drop, what goes into it, and the pressures the rider runs. */
const TyrePressure = ({bike}: {bike: string}) => {
  const queryClient = useQueryClient();
  const {events} = useEvents();
  const {weightKg, kitWeightKg, bikeWeightsKg, tubelessBikes, tyrePressures, locale} = useSettings();
  const bikeKg = bikeWeightsKg[bike];
  const tyre = events.filter(event => bike === event.bike && isTireEvent(event)).sort((first, second) => second.date.getTime() - first.date.getTime())[0];
  const width = tyre && isTireEvent(tyre) ? tyre.width : undefined;
  const saved = tyrePressures[bike] ?? {front: null, rear: null};
  const totalKg = undefined === bikeKg ? null : weightKg + bikeKg + kitWeightKg;
  const tubeless = tubelessBikes.includes(bike);
  const advised = null === totalKg || undefined === width ? null : tyrePressure(totalKg, width, tubeless);

  const save = async (wheel: 'front' | 'rear', value: string) => {
    const psi = '' === value.trim() ? null : Number(value);
    if (null !== psi && !Number.isFinite(psi)) return;
    await saveSetting('tyrePressures', {...tyrePressures, [bike]: {...saved, [wheel]: psi}});
    await queryClient.invalidateQueries({queryKey: ['settings']});
  };

  const inputs: [string, string][] = [
    ['Total weight', null === totalKg ? 'Set the bike\'s weight in Settings' : `${number(totalKg, locale, 1)} kg (${number(totalKg / KG_PER_LB, locale)} lb)`],
    ['Tyre width', undefined === width ? 'Log a tyre change with its width' : `${width} mm`],
    ['Wheel', '700C'],
    ['Setup', tubeless ? 'Tubeless' : 'Inner tubes'],
  ];

  return (
    <Card>
      <CardTitle>Tyre pressure</CardTitle>
      <Stack gap="14px">
        {null !== advised && (
          <HStack gap="12px">
            {(['front', 'rear'] as const).map(wheel => (
              <Stack key={wheel} gap="0" flex="1">
                <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
                  {wheel}
                </Text>
                <Text fontSize="2xl" fontWeight="semibold" lineHeight="1.2">
                  {advised[wheel]} psi
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {number('front' === wheel ? advised.frontBar : advised.rearBar, locale, 1)} bar
                </Text>
              </Stack>
            ))}
          </HStack>
        )}
        <Grid templateColumns="auto 1fr" columnGap="16px" rowGap="4px" fontSize="sm">
          {inputs.map(([name, value]) => [
            <Text key={`${name}-name`} color="fg.muted">
              {name}
            </Text>,
            <Text key={`${name}-value`} fontWeight="medium">
              {value}
            </Text>,
          ])}
        </Grid>
        <Text fontSize="xs" color="fg.muted">
          You, the bike and {number(kitWeightKg, locale, 1)} kg of kit, 45% on the front wheel. The pressure that squashes each tyre by 15% of
          its height (Frank Berto's rule), 8% lower when tubeless. Go a little lower on rough roads or in the wet.
          {advised?.outOfRange && ' Below 23 mm the rule reads high, take it as a ceiling.'}
        </Text>
        <Button size="sm" variant="outline" asChild={true} alignSelf="flex-start">
          <a href={SILCA_CALCULATOR} target="_blank" rel="noreferrer">
            Cross-check with SILCA <LuExternalLink />
          </a>
        </Button>
        <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
          What you run
        </Text>
        <HStack gap="12px">
          {(['front', 'rear'] as const).map(wheel => (
            <Stack key={wheel} gap="4px" flex="1">
              <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
                {wheel}
              </Text>
              <HStack gap="6px">
                <Input
                  size="sm"
                  type="number"
                  inputMode="decimal"
                  defaultValue={saved[wheel] ?? ''}
                  placeholder="psi"
                  onBlur={({target}) => save(wheel, target.value)}
                  aria-label={`${wheel} pressure in psi`}
                />
                <Text fontSize="sm" color="fg.muted">
                  psi
                </Text>
              </HStack>
            </Stack>
          ))}
        </HStack>
      </Stack>
    </Card>
  );
};

/** Running shoes in service, each against how far a pair lasts (Settings). */
const Shoes = () => {
  const gear = useGear();
  const {label} = useLabels();
  const {locale, shoeLifeKm} = useSettings();
  const {data: activities} = useAllActivities();
  // Read once, so the weeks left do not shift while the page is open.
  const [now] = useState(() => new Date());
  const shoes = useMemo(
    () =>
      shoeWear(
        gear.filter(({type, retired}) => 'shoes' === type && !retired).map(({id}) => id),
        activities ?? [],
        shoeLifeKm,
        now,
      ),
    [gear, activities, shoeLifeKm, now],
  );

  if (0 === shoes.length) return null;

  return (
    <Card>
      <CardTitle>Running shoes</CardTitle>
      <Stack gap="16px">
        {shoes.map(shoe => (
          <Stack key={shoe.id} gap="6px">
            <Text fontWeight="medium">{label(shoe.id)}</Text>
            <Text fontSize="xs" color="fg.muted">
              {km(shoe.distance, locale)} of {km(shoe.life, locale)}
              {null !== shoe.weeksLeft && ` · ${weeksLeftText(shoe.weeksLeft)}`}
            </Text>
            <Box height="6px" borderRadius="full" background="bg.muted" overflow="hidden">
              <Box
                height="full"
                borderRadius="full"
                background={STATE_COLOR[1 <= shoe.ratio ? 'overdue' : 0.8 <= shoe.ratio ? 'due' : 'ok']}
                width={`${Math.min(100, Math.max(3, shoe.ratio * 100))}%`}
              />
            </Box>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
};

const BikePage = () => {
  const {bikeId} = useParams();
  const navigate = useNavigate();
  const gear = useGear();
  const {defaultBike, costBike, retiredBikes, locale, partRules} = useSettings();
  const {label} = useLabels();
  const {events, refetch} = useEvents();
  const {data: activities} = useAllActivities();
  // Remembered on this device, like the other list toggles.
  const [withRetired, setWithRetired] = useLocalStorage('bikes-with-retired', false);

  const bike = bikeId ?? defaultBike;
  const bikes = gear.filter(
    ({type, id, retired}) => 'bike' === type && (withRetired || id === bike || (!retired && !retiredBikes.includes(id))),
  );
  const rides = useMemo(() => (activities ?? []).filter(({gear_id}) => bike === gear_id), [activities, bike]);
  const parts = useMemo(() => computeBikeParts(events, rides, bike, label, partRules), [events, rides, bike, label, partRules]);
  const wearCost = partsCostPerKm(parts);
  const history = useMemo(() => events.filter(event => bike === event.bike).reverse(), [events, bike]);
  const total = rides.reduce((sum, {distance}) => sum + distance, 0);
  const {expenses} = useExpenses();
  // Expenses are logged for one bike, the one running costs follow; sales count against them.
  const spent = expenses.reduce((sum, {amount}) => sum + amount, 0);
  const thisYear = rides
    .filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear())
    .reduce((sum, {distance}) => sum + distance, 0);

  const figures: [string, string][] = [
    ['Ridden', km(total, locale)],
    ['This year', km(thisYear, locale)],
    ['Rides', rides.length.toLocaleString(locale)],
    ['Events logged', history.length.toLocaleString(locale)],
    ...(bike === costBike && 0 < expenses.length ? [['Spent', `${number(spent, locale)} €`] as [string, string]] : []),
  ];

  const handleRemove = (event: Event) => async () => {
    await deleteEvent(event.id);
    await refetch();
    toaster.create({
      title: `${PART_NAMES[event.type]} removed`,
      action: {
        label: 'Undo',
        onClick: async () => {
          await upsertEvent(event);
          await refetch();
        },
      },
    });
  };

  const months = history.reduce((groups: [string, Event[]][], event) => {
    const month = event.date.toLocaleDateString(locale, {month: 'long', year: 'numeric'});
    const last = groups.at(-1);

    if (last?.[0] === month) last[1].push(event);
    else groups.push([month, [event]]);

    return groups;
  }, []);

  return (
    <Stack gap={{base: '16px', md: '24px'}}>
      <HStack justifyContent="space-between" alignItems="baseline" flexWrap="wrap" gap="12px">
        <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
          {label(bike)}
        </Text>
        <Switch.Root size="sm" checked={withRetired} onCheckedChange={({checked}) => setWithRetired(checked)}>
          <Switch.HiddenInput />
          <Switch.Control />
          <Switch.Label color="fg.muted">Retired bikes</Switch.Label>
        </Switch.Root>
      </HStack>

      <HStack gap="6px" flexWrap="wrap">
        {bikes.map(({id}) => (
          <Button
            key={id}
            size="sm"
            borderRadius="full"
            variant={id === bike ? 'solid' : 'outline'}
            onClick={() => navigate(`/bike/${id}`)}
          >
            {label(id)}
          </Button>
        ))}
      </HStack>

      <Grid templateColumns={{base: 'repeat(2, 1fr)', md: `repeat(${figures.length}, 1fr)`}} gap="16px">
        {figures.map(([title, value]) => (
          <Card key={title} padding="16px">
            <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
              {title}
            </Text>
            <Text fontFamily="figure" fontSize="2xl" fontWeight="semibold">
              {value}
            </Text>
          </Card>
        ))}
      </Grid>

      <Grid templateColumns={{base: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))'}} gap={{base: '16px', md: '24px'}} alignItems="start">
        <Card>
          <CardTitle>Parts</CardTitle>
          {0 === parts.length && <Text color="fg.muted">Nothing logged for this bike yet.</Text>}
          <Stack gap="16px">
            {parts.map(part => (
              <Stack key={part.type} gap="6px">
                <HStack justifyContent="space-between" gap="8px">
                  <Stack gap="0" minWidth="0">
                    <Text fontWeight="medium" truncate={true}>
                      {part.name} {PART_NAMES[part.type]}{' '}
                      <Text as="span" color="fg.muted" fontWeight="normal">
                        {part.detail}
                      </Text>
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      Fitted {relativeDay(part.fittedOn, locale).toLowerCase()} · {km(part.distance, locale)}
                      {null !== part.expected && ` of ${km(part.expected, locale)}`}
                      {null !== part.weeksLeft && ` · ${weeksLeftText(part.weeksLeft)}`}
                      {null !== part.costPerKm && ` · ${centsPerKm(part.costPerKm, locale)}`}
                    </Text>
                  </Stack>
                  <LogEvent
                    bike={bike}
                    type={part.type}
                    onLogged={refetch}
                    trigger={
                      <Button size="xs" variant={'ok' === part.state ? 'ghost' : 'surface'} colorPalette={'ok' === part.state ? undefined : 'brand'}>
                        Replace
                      </Button>
                    }
                  />
                </HStack>
                <Box height="6px" borderRadius="full" background="bg.muted" overflow="hidden">
                  <Box
                    height="full"
                    borderRadius="full"
                    background={STATE_COLOR[part.state]}
                    width={`${Math.min(100, Math.max(3, part.ratio * 100))}%`}
                  />
                </Box>
              </Stack>
            ))}
          </Stack>
          {null !== wearCost && (
            <Text fontSize="sm" color="fg.muted" marginTop="16px">
              Parts wear: {centsPerKm(wearCost, locale)}
            </Text>
          )}
          <LogEvent
            bike={bike}
            onLogged={refetch}
            trigger={
              <Button colorPalette="brand" size="sm" width="full" marginTop="20px">
                Log something else
              </Button>
            }
          />
        </Card>

        <Card>
          <CardTitle>History</CardTitle>
          {0 === history.length && <Text color="fg.muted">No events yet.</Text>}
          <Stack gap="18px" maxHeight="560px" overflowY="auto" marginRight="-8px" paddingRight="8px">
            {months.map(([month, monthEvents]) => (
              <Stack key={month} gap="6px">
                <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
                  {month}
                </Text>
                {monthEvents.map(event => (
                  <HStack key={event.id} justifyContent="space-between" gap="8px" paddingY="2px">
                    <HStack gap="10px" minWidth="0">
                      <Text fontFamily="figure" fontSize="sm" color="fg.muted" width="22px" textAlign="right" flexShrink={0}>
                        {event.date.getDate()}
                      </Text>
                      <Text truncate={true}>
                        {label(event.type)} {PART_NAMES[event.type]}{' '}
                        <Text as="span" color="fg.muted">
                          {'puncture' === event.type || 'fall' === event.type ? '' : getEventLabel(event, label, true)}
                        </Text>
                      </Text>
                      {'fall' === event.type && (
                        <Badge size="sm" colorPalette="red" variant="subtle">
                          {event.description}
                        </Badge>
                      )}
                    </HStack>
                    <IconButton aria-label="Remove this event" size="xs" variant="ghost" onClick={handleRemove(event)}>
                      <LuTrash2 />
                    </IconButton>
                  </HStack>
                ))}
              </Stack>
            ))}
          </Stack>
        </Card>
      </Grid>

      <ChartCard title="Chain rotation">
        <ChainChart bike={bike} />
      </ChartCard>
      <ChartCard title="Parts, stint by stint">
        <EventOdometerChart bike={bike} />
      </ChartCard>
      <ChartCard title="Timeline">
        <EventTimelineChart bike={bike} />
      </ChartCard>
      {bike === costBike && (
        <ChartCard title="Running costs">
          <CostPerKmChart />
        </ChartCard>
      )}
      <TyrePressure key={bike} bike={bike} />
      <Shoes />
    </Stack>
  );
};

export {BikePage};
