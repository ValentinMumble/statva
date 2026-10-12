import {useMemo, useState} from 'react';
import {Box, Button, Center, Grid, HStack, Icon, Input, Stack, Text} from '@chakra-ui/react';
import {Link} from 'react-router';
import {useLabels} from '../../hooks';
import {getFetcher} from '../../hooks/useFetcher';
import {mondayOf, TIMEFRAMES} from '../../models';
import {Activity} from '../../models/strava';
import {km} from '../format';
import {Card, CardTitle} from './Card';
import {sportIcon} from './sport';

const upsertLabel = getFetcher<void>('labels.set');

const DAY_MS = 86400000;
const FIRST_WEEKS = 5;

type Week = {monday: Date; key: string; days: (Activity | null)[]; distance: number; load: number};

/** The last weeks, newest first: the longest activity of each day, the distance, and the training load. */
const buildWeeks = (activities: Activity[], now: Date, count: number): Week[] => {
  const thisMonday = mondayOf(now).getTime();

  return Array.from({length: count}, (_, index) => {
    const monday = new Date(thisMonday - index * 7 * DAY_MS);
    const next = monday.getTime() + 7 * DAY_MS;
    const ofWeek = activities.filter(({start_date}) => {
      const time = new Date(start_date).getTime();

      return monday.getTime() <= time && time < next;
    });
    const days = Array.from({length: 7}, (_, day) => {
      const from = monday.getTime() + day * DAY_MS;
      const ofDay = ofWeek.filter(({start_date}) => {
        const time = new Date(start_date).getTime();

        return from <= time && time < from + DAY_MS;
      });

      return ofDay.reduce<Activity | null>((longest, activity) => (null === longest || activity.moving_time > longest.moving_time ? activity : longest), null);
    });

    return {
      monday,
      key: TIMEFRAMES.week.getPeriodKey(monday),
      days,
      distance: ofWeek.reduce((sum, {distance}) => sum + distance, 0),
      load: ofWeek.reduce((sum, {suffer_score}) => sum + (suffer_score ?? 0), 0),
    };
  });
};

const WeekName = ({week, locale}: {week: Week; locale: string}) => {
  const {label, refetch} = useLabels();
  const [editing, setEditing] = useState(false);
  const named = label(week.key) !== week.key;
  const fallback = `Week of ${week.monday.toLocaleDateString(locale, {day: 'numeric', month: 'short'})}`;

  if (editing) {
    return (
      <Input
        size="xs"
        autoFocus={true}
        defaultValue={named ? label(week.key) : ''}
        placeholder={fallback}
        onBlur={async ({target}) => {
          setEditing(false);
          if ('' !== target.value.trim() && target.value !== label(week.key)) {
            await upsertLabel(week.key, target.value.trim());
            await refetch();
          }
        }}
        onKeyDown={({key, currentTarget}) => 'Enter' === key && currentTarget.blur()}
      />
    );
  }

  return (
    <Text as="button" fontSize="sm" textAlign="left" truncate={true} color={named ? 'fg' : 'fg.muted'} title="Rename this week" onClick={() => setEditing(true)}>
      {named ? label(week.key) : fallback}
    </Text>
  );
};

const WeeksCard = ({activities, now, locale}: {activities: Activity[]; now: Date; locale: string}) => {
  const [count, setCount] = useState(FIRST_WEEKS);
  const weeks = useMemo(() => buildWeeks(activities, now, count), [activities, now, count]);
  const maxLoad = Math.max(...weeks.map(({load}) => load), 1);
  const today = Math.round((now.getTime() - mondayOf(now).getTime()) / DAY_MS);

  return (
    <Card>
      <CardTitle>Weeks</CardTitle>
      <Stack gap="10px">
        <Grid templateColumns="minmax(0, 1.4fr) repeat(7, 26px) minmax(64px, 0.8fr)" gap="6px" alignItems="center">
          <Box />
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
            <Text key={index} fontSize="xs" textAlign="center" color={index === today ? 'fg' : 'fg.muted'} fontWeight={index === today ? 'semibold' : 'normal'}>
              {day}
            </Text>
          ))}
          <Text fontSize="xs" color="fg.muted" textAlign="right">
            Load
          </Text>
          {weeks.map(week => (
            <Box key={week.key} display="contents">
              <Stack gap="0" minWidth="0">
                <WeekName week={week} locale={locale} />
                <Text fontSize="xs" color="fg.muted">
                  {km(week.distance, locale)}
                </Text>
              </Stack>
              {week.days.map((activity, day) =>
                null === activity ? (
                  <Center key={day} height="26px">
                    <Box width="4px" height="4px" borderRadius="full" background="bg.muted" />
                  </Center>
                ) : (
                  <Link key={day} to={`/activities/${activity.id}`} title={activity.name}>
                    <Center height="26px" borderRadius="8px" background={activity.sport_type.includes('Ride') ? 'brand.muted' : 'bg.muted'} _hover={{background: 'brand.emphasized'}}>
                      <Icon as={sportIcon(activity.sport_type)} boxSize="14px" color={activity.sport_type.includes('Ride') ? 'brand.fg' : 'fg'} />
                    </Center>
                  </Link>
                ),
              )}
              <HStack gap="6px" justifyContent="flex-end">
                <Box flex="1" maxWidth="48px" height="6px" borderRadius="full" background="bg.muted" overflow="hidden">
                  <Box height="full" width={`${(week.load / maxLoad) * 100}%`} background="brand.solid" borderRadius="full" />
                </Box>
                <Text fontSize="xs" fontFamily="figure" width="28px" textAlign="right">
                  {week.load}
                </Text>
              </HStack>
            </Box>
          ))}
        </Grid>
        <Button size="xs" variant="ghost" alignSelf="center" onClick={() => setCount(count + 4)}>
          Show older weeks
        </Button>
      </Stack>
    </Card>
  );
};

export {WeeksCard};
