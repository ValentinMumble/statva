import {useState} from 'react';
import {Box, Button, Group, HStack, SegmentGroupValueChangeDetails, Stack, Text} from '@chakra-ui/react';
import {SegmentedControl} from './ui';
import {LogEvent} from './event';
import {useActivities, useEvents, useLabels} from '../hooks';
import {computeBikeParts, formatDistance, labelCollection, PartState, RETIRED_BIKES, SUPER6} from '../models';

const STATE_COLOR: Record<PartState, string> = {
  ok: 'green.solid',
  due: 'yellow.solid',
  overdue: 'red.solid',
};

/**
 * What is fitted to the bike right now and how worn it is, so the work that is due shows
 * up without opening anything. Every part is also a shortcut to logging its replacement.
 */
const BikeParts = () => {
  const [gearId, setGearId] = useState<string>(SUPER6);
  const {label} = useLabels();
  const {events, refetch: refreshEvents} = useEvents();
  const {activities} = useActivities({
    withCommute: true,
    withPrivate: true,
    sort: 'date',
    sortDirection: 'asc',
    gearId,
  });

  const handleGearChange = ({value}: SegmentGroupValueChangeDetails) => value && setGearId(value);

  const bikes = [...new Set(events.map(({bike}) => bike))].filter(bike => !RETIRED_BIKES.includes(bike));
  const parts = computeBikeParts(events, activities ?? [], gearId, label);
  const total = (activities ?? []).reduce((total, {distance}) => total + distance, 0);

  if (0 === bikes.length) return null;

  return (
    <Stack gap="10px" paddingX="10px">
      <HStack justifyContent="space-between" gap="10px" flexWrap="wrap">
        <Text fontSize="sm" color="fg.muted">
          {formatDistance(total)} on {label(gearId)}
        </Text>
        <Group gap="8px">
          <SegmentedControl
            size="xs"
            value={gearId}
            onValueChange={handleGearChange}
            items={labelCollection(bikes, key => label(key, true)).items}
          />
          <LogEvent
            bike={gearId}
            onLogged={refreshEvents}
            trigger={
              <Button size={{base: 'sm', md: 'xs'}} variant="surface">
                Log
              </Button>
            }
          />
        </Group>
      </HStack>

      <Stack gap="9px">
        {0 === parts.length && (
          <Text fontSize="sm" color="fg.muted">
            Nothing logged for this bike yet.
          </Text>
        )}
        {parts.map(part => (
          <Stack key={part.type} gap="3px">
            <HStack justifyContent="space-between" gap="10px" alignItems="baseline">
              <Text fontSize="sm" truncate={true}>
                {part.name} {part.detail}
              </Text>
              <Text fontSize="xs" color={'ok' === part.state ? 'fg.muted' : STATE_COLOR[part.state]} whiteSpace="nowrap">
                {formatDistance(part.distance)}
                {null !== part.expected && ` / ${formatDistance(part.expected)}`}
              </Text>
            </HStack>
            <Box height="5px" borderRadius="3px" background="bg.muted" overflow="hidden">
              <Box
                height="100%"
                borderRadius="3px"
                background={STATE_COLOR[part.state]}
                width={`${Math.min(100, Math.max(2, part.ratio * 100))}%`}
              />
            </Box>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

export {BikeParts};
