import {lazy, Suspense, useMemo, useState} from 'react';
import {Badge, Box, Button, Grid, HStack, IconButton, Spinner, Stack, Switch, Text} from '@chakra-ui/react';
import {useNavigate, useParams} from 'react-router';
import {LuTrash2} from 'react-icons/lu';
import {LogEvent} from '../../components/event';
import {toaster} from '../../components/ui';
import {useAllActivities, useEvents, useGear, useLabels, useSettings} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {computeBikeParts, Event, getEventLabel, PartState} from '../../models';
import {Card, CardTitle} from '../components/Card';
import {km, relativeDay} from '../format';

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

const ChartCard = ({title, children}: {title: string; children: React.ReactNode}) => (
  <Card>
    <CardTitle>{title}</CardTitle>
    <Suspense fallback={<Spinner />}>{children}</Suspense>
  </Card>
);

const BikePage = () => {
  const {bikeId} = useParams();
  const navigate = useNavigate();
  const gear = useGear();
  const {defaultBike, costBike, retiredBikes, locale, partRules} = useSettings();
  const {label} = useLabels();
  const {events, refetch} = useEvents();
  const {data: activities} = useAllActivities();
  const [withRetired, setWithRetired] = useState(false);

  const bike = bikeId ?? defaultBike;
  const bikes = gear.filter(({type, id}) => 'bike' === type && (withRetired || !retiredBikes.includes(id) || id === bike));
  const rides = useMemo(() => (activities ?? []).filter(({gear_id}) => bike === gear_id), [activities, bike]);
  const parts = useMemo(() => computeBikeParts(events, rides, bike, label, partRules), [events, rides, bike, label, partRules]);
  const history = useMemo(() => events.filter(event => bike === event.bike).reverse(), [events, bike]);
  const total = rides.reduce((sum, {distance}) => sum + distance, 0);
  const thisYear = rides
    .filter(({start_date}) => new Date(start_date).getFullYear() === new Date().getFullYear())
    .reduce((sum, {distance}) => sum + distance, 0);

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

      <Grid templateColumns={{base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)'}} gap="16px">
        {[
          ['Ridden', km(total, locale)],
          ['This year', km(thisYear, locale)],
          ['Rides', rides.length.toLocaleString(locale)],
          ['Events logged', history.length.toLocaleString(locale)],
        ].map(([title, value]) => (
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
    </Stack>
  );
};

export {BikePage};
