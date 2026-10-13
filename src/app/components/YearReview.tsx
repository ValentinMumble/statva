import {ReactNode, useMemo, useState} from 'react';
import {Grid, HStack, Link as ChakraLink, Stack, Text} from '@chakra-ui/react';
import {Link} from 'react-router';
import {activityYears} from '../../models/calendar';
import {GetLabel} from '../../models/label';
import {formatDay} from '../../models/local-day';
import {DetailedActivity} from '../../models/strava';
import {formatDistance, formatDuration} from '../../models/util';
import {buildYearReview, countNewTiles, DatedRoute, ReviewRide} from '../../models/year-review';
import {Figure, Panel, YearSelect} from './Panel';

type YearReviewProps = {
  activities: DetailedActivity[];
  routes: DatedRoute[];
  label: GetLabel;
  locale: string;
  now: Date;
};

const count = (value: number): string => Math.round(value).toLocaleString();

type HighlightProps = {heading: string; children: ReactNode; detail?: string};

// One line of the review: what it is on the left, the answer on the right.
const Highlight = ({heading, children, detail}: HighlightProps) => (
  <HStack justifyContent="space-between" alignItems="baseline" gap="12px" paddingY="7px" borderBottomWidth="1px" borderColor="border.subtle">
    <Text fontSize="sm" color="fg.muted" flexShrink="0">
      {heading}
    </Text>
    <Stack gap="0" minWidth="0" alignItems="flex-end" textAlign="right">
      {children}
      {undefined !== detail && (
        <Text fontSize="xs" color="fg.muted">
          {detail}
        </Text>
      )}
    </Stack>
  </HStack>
);

const RideLink = ({ride}: {ride: ReviewRide}) => (
  <ChakraLink asChild={true} fontSize="sm" lineClamp={1} color="fg">
    <Link to={`/activities/${ride.id}`}>{ride.name}</Link>
  </ChakraLink>
);

const Value = ({children}: {children: ReactNode}) => (
  <Text fontSize="sm" lineClamp={1}>
    {children}
  </Text>
);

/** The best of one year: totals, the standout days and rides, and where it went for the first time. */
const YearReview = ({activities, routes, label, locale, now}: YearReviewProps) => {
  const currentYear = now.getFullYear();
  // This year is always offered, even before its first ride.
  const years = useMemo(
    () => [...new Set([currentYear, ...activityYears(activities)])].sort((newer, older) => older - newer),
    [activities, currentYear],
  );
  const [year, setYear] = useState(currentYear);
  const review = useMemo(() => buildYearReview(activities, year, label), [activities, year, label]);
  // Walking every route up to the year is the slow part, so it only runs for the year shown.
  const newTiles = useMemo(() => countNewTiles(routes, year), [routes, year]);
  const day = (value: string): string => formatDay(value, locale, {weekday: 'short'});

  return (
    <Panel title="Year in review" action={<YearSelect years={years} value={year} onChange={setYear} />}>
      {0 === review.activities ? (
        <Text fontSize="sm" color="fg.muted">
          Nothing recorded in {year} yet.
        </Text>
      ) : (
        <Stack gap="16px">
          <Grid templateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap="16px">
            <Figure value={count(review.activities)} caption="activities" />
            <Figure value={count(review.distance / 1000)} unit="km" caption="covered" />
            <Figure value={formatDuration(review.movingTime, true)} caption="moving" />
            <Figure value={count(newTiles)} caption="new explorer tiles" />
          </Grid>
          <Grid templateColumns={{base: '1fr', md: '1fr 1fr'}} columnGap="32px">
            {null !== review.biggestDay && (
              <Highlight
                heading="Biggest day"
                detail={1 < review.biggestDay.count ? `${review.biggestDay.count} activities` : undefined}
              >
                <Value>
                  {day(review.biggestDay.day)} · {formatDistance(review.biggestDay.distance)}
                </Value>
              </Highlight>
            )}
            {null !== review.longestRide && (
              <Highlight
                heading="Longest ride"
                detail={`${day(review.longestRide.day)} · ${formatDistance(review.longestRide.value)}`}
              >
                <RideLink ride={review.longestRide} />
              </Highlight>
            )}
            {null !== review.topBike && (
              <Highlight
                heading="Most used bike"
                detail={`${formatDistance(review.topBike.distance)} · ${count(review.topBike.rides)} activities`}
              >
                <Value>{review.topBike.name}</Value>
              </Highlight>
            )}
            {null !== review.bestMonth && (
              <Highlight heading="Best month" detail={formatDistance(review.bestMonth.distance)}>
                <Value>
                  {formatDay(`${year}-${String(review.bestMonth.month).padStart(2, '0')}-01`, locale, {
                    day: undefined,
                    month: 'long',
                    year: undefined,
                  })}
                </Value>
              </Highlight>
            )}
            {null !== review.mostKudos && (
              <Highlight
                heading="Most kudos"
                detail={`${day(review.mostKudos.day)} · ${count(review.mostKudos.value)} kudos`}
              >
                <RideLink ride={review.mostKudos} />
              </Highlight>
            )}
            {0 < review.emoji.length && (
              <Highlight heading="Top emoji" detail="activities with each one in their name">
                <Value>{review.emoji.map(({emoji, count: uses}) => `${emoji} ${uses}`).join('  ')}</Value>
              </Highlight>
            )}
            {null !== review.first && (
              <Highlight heading="First activity" detail={day(review.first.day)}>
                <RideLink ride={review.first} />
              </Highlight>
            )}
            {null !== review.last && (
              <Highlight heading="Last activity" detail={day(review.last.day)}>
                <RideLink ride={review.last} />
              </Highlight>
            )}
          </Grid>
        </Stack>
      )}
    </Panel>
  );
};

export {YearReview};
