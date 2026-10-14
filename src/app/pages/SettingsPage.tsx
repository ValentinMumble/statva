import {useMemo, useState} from 'react';
import {
  Box,
  Button,
  Checkbox,
  Field,
  Grid,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@chakra-ui/react';
import {useQueryClient} from '@tanstack/react-query';
import {LuTrash2} from 'react-icons/lu';
import {toaster} from '../../components/ui';
import {leaveDemo} from '../../demo/mode';
import {useAllActivities, useEvents, useExpenses, useFtp, useGear, useLabels, useSession, useSettings} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {countBy, DEFAULT_SETTINGS, RideRule, Settings} from '../../models';
import {Card} from '../components/Card';
import {sportName} from '../components/sport';

const saveSetting = getFetcher<void>('settings.set');
const upsertLabel = getFetcher<void>('labels.set');
const deleteLabel = getFetcher<void>('labels.delete');

const LOCALES = [
  ['en-GB', 'English (UK)'],
  ['en-US', 'English (US)'],
  ['fr-FR', 'Français'],
  ['de-DE', 'Deutsch'],
  ['es-ES', 'Español'],
  ['it-IT', 'Italiano'],
  ['nl-NL', 'Nederlands'],
];

// Parts whose life can be set; the others are read from how long the previous ones lasted.
const LIMITED_PARTS: [keyof Settings['partLimitsKm'], string][] = [
  ['chain', 'Chain, per stint'],
  ['tire', 'Tires'],
  ['cassette', 'Cassette, over all its stints'],
  ['brake_pad', 'Brake pads'],
  ['battery', 'Battery charge'],
];

// Parts that cost something to replace, for their cost per km. A chain's price is spread over
// what the retired chains did in all, since its limit is only one stint of the rotation.
const PRICED_PARTS: [keyof Settings['partPricesEur'], string][] = [
  ['chain', 'Chain'],
  ['tire', 'Tires'],
  ['cassette', 'Cassette'],
  ['brake_pad', 'Brake pads'],
  ['brake_bleed', 'Brake fluid'],
];

const list = (text: string): string[] =>
  text
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(item => '' !== item);

// "Pirate: 🏴‍☠️, pirate" lines, one group per line.
const markersToText = (markers: Record<string, string[]>): string =>
  Object.entries(markers)
    .map(([group, values]) => `${group}: ${values.join(', ')}`)
    .join('\n');

const textToMarkers = (text: string): Record<string, string[]> =>
  Object.fromEntries(
    text
      .split('\n')
      .map(line => line.split(':'))
      .filter(([group, values]) => group?.trim() && values)
      .map(([group, values]) => [group.trim(), list(values)]),
  );

const Section = ({title, description, children}: {title: string; description: string; children: React.ReactNode}) => (
  <Card>
    <Grid templateColumns={{base: 'minmax(0, 1fr)', lg: '240px minmax(0, 1fr)'}} gap={{base: '14px', lg: '32px'}}>
      <Stack gap="4px">
        <Text fontFamily="heading" fontWeight="semibold">
          {title}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {description}
        </Text>
      </Stack>
      <Stack gap="16px">{children}</Stack>
    </Grid>
  </Card>
);

// A heading for a group of checkboxes. Not a field label: a field gives its one id to every
// checkbox inside, and a click on any label would then toggle the first box.
const GroupLabel = ({children}: {children: React.ReactNode}) => (
  <Text fontSize="sm" fontWeight="medium">
    {children}
  </Text>
);

const NEW_RULE: RideRule = {name: '', place: [0, 0], radiusM: 250, maxKm: 20, weekdaysOnly: true, commute: true, gearId: null};

/** The ride rules, one card each: where, which rides, and what they get. */
const RideRules = ({
  rules,
  bikes,
  label,
  onChange,
}: {
  rules: RideRule[];
  bikes: {id: string}[];
  label: (key: string) => string;
  onChange: (rules: RideRule[]) => void;
}) => {
  const change = (index: number, update: Partial<RideRule>) => onChange(rules.map((rule, at) => (at === index ? {...rule, ...update} : rule)));

  return (
    <Stack gap="12px">
      {rules.map((rule, index) => (
        <Stack key={index} gap="12px" borderWidth="1px" borderRadius="10px" padding="12px">
          <HStack gap="12px" alignItems="flex-end">
            <Field.Root>
              <Field.Label>Name, with its emoji</Field.Label>
              <Input value={rule.name} placeholder="Akeneo ⚙️" onChange={({target}) => change(index, {name: target.value})} />
            </Field.Root>
            <IconButton aria-label="Remove this rule" variant="ghost" onClick={() => onChange(rules.filter((_, at) => at !== index))}>
              <LuTrash2 />
            </IconButton>
          </HStack>
          <Grid templateColumns={{base: '1fr 1fr', md: '2fr 1fr 1fr 2fr'}} gap="12px">
            <Field.Root>
              <Field.Label>Turns around at (latitude, longitude)</Field.Label>
              <Input
                defaultValue={rule.place.join(', ')}
                placeholder="47.2112, -1.5757"
                onBlur={({target}) => {
                  const [latitude, longitude] = list(target.value).map(Number);
                  if (Number.isFinite(latitude) && Number.isFinite(longitude)) change(index, {place: [latitude, longitude]});
                }}
              />
            </Field.Root>
            <NumberField label="Within" unit="m" value={rule.radiusM} onChange={value => change(index, {radiusM: value ?? NEW_RULE.radiusM})} />
            <NumberField label="Rides up to" unit="km" value={rule.maxKm} onChange={value => change(index, {maxKm: value ?? NEW_RULE.maxKm})} />
            <Field.Root>
              <Field.Label>Bike</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={rule.gearId ?? ''} onChange={({target}) => change(index, {gearId: target.value || null})}>
                  <option value="">Leave as it is</option>
                  {bikes.map(({id}) => (
                    <option key={id} value={id}>
                      {label(id)}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          </Grid>
          <HStack gap="20px" flexWrap="wrap">
            <Checkbox.Root checked={rule.weekdaysOnly} onCheckedChange={({checked}) => change(index, {weekdaysOnly: true === checked})}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Weekdays only</Checkbox.Label>
            </Checkbox.Root>
            <Checkbox.Root checked={rule.commute} onCheckedChange={({checked}) => change(index, {commute: true === checked})}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Mark as a commute</Checkbox.Label>
            </Checkbox.Root>
          </HStack>
        </Stack>
      ))}
      <Button variant="outline" size="sm" alignSelf="flex-start" onClick={() => onChange([...rules, NEW_RULE])}>
        Add a rule
      </Button>
    </Stack>
  );
};

const Toggle = ({label, checked, onChange}: {label: string; checked: boolean; onChange: (checked: boolean) => void}) => (
  <Switch.Root checked={checked} onCheckedChange={({checked}) => onChange(checked)}>
    <Switch.HiddenInput />
    <Switch.Control />
    <Switch.Label>{label}</Switch.Label>
  </Switch.Root>
);

const NumberField = ({label, value, unit, onChange, placeholder, step}: {label: string; value: number | undefined; unit?: string; onChange: (value: number | undefined) => void; placeholder?: string; step?: number}) => (
  <Field.Root>
    <Field.Label>{label}</Field.Label>
    <HStack gap="8px">
      <Input
        type="number"
        step={step}
        value={undefined === value ? '' : value}
        placeholder={placeholder}
        onChange={({target}) => onChange('' === target.value ? undefined : Number(target.value))}
        maxWidth="160px"
      />
      {unit && <Text color="fg.muted">{unit}</Text>}
    </HStack>
  </Field.Root>
);

const LabelsSection = () => {
  const {labels, refetch} = useLabels();
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  const save = async (labelKey: string, labelValue: string) => {
    await upsertLabel(labelKey, labelValue);
    await refetch();
  };

  return (
    <Section title="Labels" description="Rename anything: a bike, a week, a pool. Emojis work everywhere in the app.">
      <HStack gap="8px" alignItems="flex-end" flexWrap="wrap">
        <Field.Root flex="1" minWidth="160px">
          <Field.Label>Key</Field.Label>
          <Input value={key} placeholder="b1234567, 2026-41, Ride…" onChange={({target}) => setKey(target.value)} />
        </Field.Root>
        <Field.Root flex="1" minWidth="160px">
          <Field.Label>Label</Field.Label>
          <Input value={value} placeholder="Aero 🦈" onChange={({target}) => setValue(target.value)} />
        </Field.Root>
        <Button
          disabled={'' === key.trim() || '' === value.trim()}
          onClick={async () => {
            await save(key.trim(), value.trim());
            setKey('');
            setValue('');
          }}
        >
          Add
        </Button>
      </HStack>
      <Stack gap="6px" maxHeight="360px" overflowY="auto">
        {Object.entries(labels).map(([labelKey, labelValue]) => (
          <HStack key={labelKey} gap="8px">
            <Text fontSize="sm" color="fg.muted" width="40%" truncate={true} title={labelKey}>
              {labelKey}
            </Text>
            <Input
              size="sm"
              defaultValue={labelValue}
              onBlur={({target}) => target.value !== labelValue && save(labelKey, target.value)}
            />
            <IconButton
              aria-label={`Remove the label for ${labelKey}`}
              size="sm"
              variant="ghost"
              onClick={async () => {
                await deleteLabel(labelKey);
                await refetch();
              }}
            >
              <LuTrash2 />
            </IconButton>
          </HStack>
        ))}
      </Stack>
    </Section>
  );
};

const AccountSection = () => {
  const {isDemo} = useSession();
  const settings = useSettings();
  const {labels} = useLabels();
  const {events} = useEvents();
  const {expenses} = useExpenses();
  const {tests: ftpTests} = useFtp();
  const [confirming, setConfirming] = useState(false);

  // Everything the rider typed into Statva; the activities themselves are on Strava.
  const handleExport = () => {
    const data = {exportedAt: new Date().toISOString(), settings, labels, events, expenses, ftpTests};
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
    link.download = `statva-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Section title="Account" description="Your data, and your connection to Strava.">
      <HStack gap="8px" flexWrap="wrap">
        <Button variant="outline" onClick={handleExport}>
          Export my data
        </Button>
        {isDemo ? (
          <Button variant="outline" onClick={leaveDemo}>
            Leave the demo
          </Button>
        ) : confirming ? (
          <form method="post" action="/api/auth/disconnect">
            <HStack gap="8px">
              <Text fontSize="sm">This deletes everything Statva holds for you.</Text>
              <Button type="submit" colorPalette="red">
                Disconnect and delete
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </HStack>
          </form>
        ) : (
          <Button variant="outline" colorPalette="red" onClick={() => setConfirming(true)}>
            Disconnect from Strava
          </Button>
        )}
      </HStack>
      <Text fontSize="sm" color="fg.muted">
        The export holds your settings, labels, parts history, expenses and FTP tests. Your activities stay on Strava.
      </Text>
    </Section>
  );
};

const SettingsPage = () => {
  const current = useSettings();
  const gear = useGear();
  const {label} = useLabels();
  const {data: activities} = useAllActivities();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);

  const settings: Settings = {...current, ...draft};
  const changed = Object.keys(draft) as (keyof Settings)[];
  const bikes = gear.filter(({type}) => 'bike' === type);
  // Most practised first, in an order that does not move when a box is ticked. Gravel,
  // virtual and trail run already count under Ride and Run.
  const sports = useMemo(() => {
    const counts = countBy(activities ?? [], ({sport_type}) => sport_type);

    return Object.keys(counts)
      .filter(sport => !['GravelRide', 'VirtualRide', 'TrailRun'].includes(sport))
      .sort((a, b) => counts[b] - counts[a]);
  }, [activities]);

  const set = <K extends keyof Settings>(field: K, value: Settings[K]) => setDraft(draft => ({...draft, [field]: value}));

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(changed.map(field => saveSetting(field, settings[field])));
    await queryClient.invalidateQueries({queryKey: ['settings']});
    setDraft({});
    setSaving(false);
    toaster.create({title: 'Settings saved'});
  };

  return (
    <Stack gap={{base: '16px', md: '24px'}} paddingBottom="80px">
      <Text fontFamily="heading" fontSize={{base: '2xl', md: '3xl'}} fontWeight="bold" letterSpacing="-0.02em">
        Settings
      </Text>

      <Section title="Bikes" description="Which bike the app opens on, and which ones are out of service.">
        <Grid templateColumns={{base: '1fr', md: '1fr 1fr'}} gap="16px">
          <Field.Root>
            <Field.Label>Main bike</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field value={settings.defaultBike ?? ''} onChange={({target}) => set('defaultBike', target.value || null)}>
                <option value="">Primary bike on Strava</option>
                {bikes.map(({id}) => (
                  <option key={id} value={id}>
                    {label(id)}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label>Running costs follow</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field value={settings.costBike ?? ''} onChange={({target}) => set('costBike', target.value || null)}>
                <option value="">The main bike</option>
                {bikes.map(({id}) => (
                  <option key={id} value={id}>
                    {label(id)}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
        </Grid>
        <Stack gap="6px">
          <GroupLabel>Retired</GroupLabel>
          <HStack gap="16px" flexWrap="wrap">
            {bikes.map(({id, retired}) => (
              <Checkbox.Root
                key={id}
                // Gear Strava no longer lists is retired there; that cannot be undone here.
                disabled={retired}
                checked={retired || settings.retiredBikes.includes(id)}
                onCheckedChange={({checked}) =>
                  set('retiredBikes', checked ? [...settings.retiredBikes, id] : settings.retiredBikes.filter(bike => bike !== id))
                }
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>{label(id)}</Checkbox.Label>
              </Checkbox.Root>
            ))}
          </HStack>
        </Stack>
        <Stack gap="6px">
          <GroupLabel>For the tyre pressure calculator</GroupLabel>
          <Grid templateColumns={{base: '1fr 1fr', md: 'repeat(4, 1fr)'}} gap="16px" alignItems="end">
            {bikes
              .filter(({id, retired}) => !retired && !settings.retiredBikes.includes(id))
              .map(({id}) => (
                <Stack key={id} gap="6px">
                  <NumberField
                    label={label(id)}
                    unit="kg"
                    step={0.1}
                    placeholder="Weight"
                    value={settings.bikeWeightsKg[id]}
                    onChange={value => set('bikeWeightsKg', {...settings.bikeWeightsKg, [id]: value as number})}
                  />
                  <Checkbox.Root
                    checked={settings.tubelessBikes.includes(id)}
                    onCheckedChange={({checked}) =>
                      set('tubelessBikes', checked ? [...settings.tubelessBikes, id] : settings.tubelessBikes.filter(bike => bike !== id))
                    }
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>Tubeless</Checkbox.Label>
                  </Checkbox.Root>
                </Stack>
              ))}
            <NumberField
              label="What you carry"
              unit="kg"
              step={0.1}
              value={settings.kitWeightKg}
              onChange={value => set('kitWeightKg', value ?? DEFAULT_SETTINGS.kitWeightKg)}
            />
          </Grid>
        </Stack>
      </Section>

      <Section title="Parts" description="How long parts last and what they cost. Left empty, a life is judged against how long the previous ones lasted.">
        <Grid templateColumns={{base: '1fr', md: '1fr 1fr'}} gap="16px">
          {LIMITED_PARTS.map(([part, name]) => (
            <NumberField
              key={part}
              label={name}
              unit="km"
              placeholder="From history"
              value={settings.partLimitsKm[part]}
              onChange={value => set('partLimitsKm', {...settings.partLimitsKm, [part]: value})}
            />
          ))}
        </Grid>
        <Stack gap="6px">
          <GroupLabel>Prices, for the cost per km</GroupLabel>
          <Grid templateColumns={{base: '1fr', md: '1fr 1fr'}} gap="16px">
            {PRICED_PARTS.map(([part, name]) => (
              <NumberField
                key={part}
                label={name}
                unit="€"
                step={0.01}
                placeholder="Not set"
                value={settings.partPricesEur[part]}
                onChange={value => set('partPricesEur', {...settings.partPricesEur, [part]: value})}
              />
            ))}
          </Grid>
        </Stack>
        <Field.Root>
          <Field.Label>Retired chains</Field.Label>
          <Input
            defaultValue={settings.retiredChains.join(', ')}
            placeholder="🍒, 🫐"
            onBlur={({target}) => set('retiredChains', list(target.value))}
          />
          <Field.HelperText>Never suggested as the next chain to fit.</Field.HelperText>
        </Field.Root>
        <NumberField
          label="Running shoes last"
          unit="km"
          value={settings.shoeLifeKm}
          onChange={value => set('shoeLifeKm', value ?? DEFAULT_SETTINGS.shoeLifeKm)}
        />
      </Section>

      <Section
        title="Ride rules"
        description="For rides that come back again and again, like a commute: as soon as one lands on Strava, it gets the name, the commute flag and the bike. A name you gave with an emoji is kept."
      >
        <RideRules rules={settings.rideRules} bikes={bikes} label={label} onChange={rules => set('rideRules', rules)} />
      </Section>

      <Section title="Goal and sports" description="The yearly target, and the sports the stats show.">
        <NumberField label="Yearly riding goal" unit="km" value={settings.yearGoalKm} onChange={value => set('yearGoalKm', value ?? DEFAULT_SETTINGS.yearGoalKm)} />
        <NumberField
          label="Car cost per km (€), to count what commuting saves"
          unit="€"
          step={0.01}
          value={settings.carCostPerKm}
          onChange={value => set('carCostPerKm', value ?? DEFAULT_SETTINGS.carCostPerKm)}
        />
        <Stack gap="6px">
          <GroupLabel>Sports</GroupLabel>
          <HStack gap="16px" flexWrap="wrap">
            {[...sports, ...settings.sports.filter(sport => !sports.includes(sport))].map(sport => (
              <Checkbox.Root
                key={sport}
                checked={settings.sports.includes(sport)}
                onCheckedChange={({checked}) => set('sports', checked ? [...settings.sports, sport] : settings.sports.filter(item => item !== sport))}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>{sportName(sport)}</Checkbox.Label>
              </Checkbox.Root>
            ))}
          </HStack>
        </Stack>
      </Section>

      <Section title="Body" description="Used for heart rate zones and calorie estimates.">
        <Grid templateColumns={{base: '1fr 1fr', md: 'repeat(4, 1fr)'}} gap="16px">
          <NumberField label="Weight" unit="kg" value={settings.weightKg} onChange={value => set('weightKg', value ?? DEFAULT_SETTINGS.weightKg)} />
        </Grid>
        <Field.Root>
          <Field.Label>Heart rate zones start at</Field.Label>
          <Input
            defaultValue={settings.heartRate.zones.join(', ')}
            placeholder="120, 145, 160, 175"
            onBlur={({target}) => set('heartRate', {...settings.heartRate, zones: list(target.value).map(Number).filter(Number.isFinite)})}
          />
          <Field.HelperText>Where zones 2, 3, 4 and 5 begin, in bpm.</Field.HelperText>
        </Field.Root>
      </Section>

      <Section title="Club" description="Rides named after your club get their own stats: groups, finishes, speed and power.">
        <Toggle
          label="I ride with a club"
          checked={null !== settings.club}
          onChange={checked => set('club', checked ? {name: '', markers: {}, groupWords: [], groupTags: []} : null)}
        />
        {null !== settings.club && (
          <>
            <Field.Root>
              <Field.Label>Club name, as it appears in ride names</Field.Label>
              <Input
                value={settings.club.name}
                onChange={({target}) => settings.club && set('club', {...settings.club, name: target.value})}
              />
              <Field.HelperText>A ride named "{settings.club.name || 'Club'} #42 C1" is a club ride in group C1.</Field.HelperText>
            </Field.Root>
            <Field.Root>
              <Field.Label>Club website</Field.Label>
              <Input
                type="url"
                defaultValue={settings.club.url ?? ''}
                placeholder="https://"
                onBlur={({target}) => settings.club && set('club', {...settings.club, url: target.value.trim() || undefined})}
              />
              <Field.HelperText>Linked from the club's page.</Field.HelperText>
            </Field.Root>
            <Field.Root>
              <Field.Label>Groups marked in names or notes</Field.Label>
              <Textarea
                defaultValue={markersToText(settings.club.markers)}
                placeholder={'Pirate: 🏴‍☠️, pirate'}
                onBlur={({target}) => settings.club && set('club', {...settings.club, markers: textToMarkers(target.value)})}
              />
              <Field.HelperText>One group per line, then the emojis or words that put a ride in it.</Field.HelperText>
            </Field.Root>
            <Field.Root>
              <Field.Label>Other group rides</Field.Label>
              <Input
                defaultValue={settings.club.groupWords.join(', ')}
                onBlur={({target}) => settings.club && set('club', {...settings.club, groupWords: list(target.value)})}
              />
              <Field.HelperText>Words in a ride name that make it a group ride, for the solo or group chart.</Field.HelperText>
            </Field.Root>
          </>
        )}
      </Section>

      <Section title="Display" description="Language for dates and numbers, maps, and how notes are read.">
        <Grid templateColumns={{base: '1fr', md: '1fr 1fr'}} gap="16px">
          <Field.Root>
            <Field.Label>Dates and numbers</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field value={settings.locale} onChange={({target}) => set('locale', target.value)}>
                {LOCALES.map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label>Maps open on</Field.Label>
            <Input
              defaultValue={settings.mapCenter.join(', ')}
              placeholder="45.90, 6.13"
              onBlur={({target}) => {
                const [lat, lng] = list(target.value).map(Number);
                if (Number.isFinite(lat) && Number.isFinite(lng)) set('mapCenter', [lat, lng]);
              }}
            />
            <Field.HelperText>Latitude and longitude, when there is no track to centre on.</Field.HelperText>
          </Field.Root>
        </Grid>
        <Toggle
          label='Read normalized power from private notes ("NP: 245") where Statva has not worked it out'
          checked={settings.normalizedPowerFromNote}
          onChange={checked => set('normalizedPowerFromNote', checked)}
        />
        <Toggle
          label="Point out activities whose name has no emoji yet"
          checked={settings.unprocessedEmoji}
          onChange={checked => set('unprocessedEmoji', checked)}
        />
      </Section>

      <LabelsSection />
      <AccountSection />

      {0 < changed.length && (
        <Box
          position="fixed"
          bottom={{base: 'calc(88px + env(safe-area-inset-bottom))', md: '24px'}}
          left={{base: '16px', md: 'calc(232px + 32px)'}}
          right={{base: '16px', md: '32px'}}
          zIndex="sticky"
        >
          <Card padding="12px 16px" boxShadow="lg" maxWidth="1536px" marginX="auto">
            <HStack justifyContent="space-between">
              <Text fontSize="sm">
                {changed.length} unsaved {1 === changed.length ? 'change' : 'changes'}
              </Text>
              <HStack gap="8px">
                <Button variant="ghost" size="sm" onClick={() => setDraft({})}>
                  Discard
                </Button>
                <Button colorPalette="brand" size="sm" loading={saving} onClick={handleSave}>
                  Save
                </Button>
              </HStack>
            </HStack>
          </Card>
        </Box>
      )}
    </Stack>
  );
};

export {SettingsPage};
