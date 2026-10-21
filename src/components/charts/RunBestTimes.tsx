import {useMemo} from 'react';
import {Box, Table, Text} from '@chakra-ui/react';
import {Link} from 'react-router';
import {useActivityMeta} from '../../hooks';
import {runBestTimes} from '../../models';

// Race times read as h:mm:ss, or m:ss under an hour.
const raceTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(Math.round(seconds % 60)).padStart(2, '0');

  return 0 < hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};

const DISTANCE_NAMES: Record<string, string> = {
  '1K': '1 km',
  '5K': '5 km',
  '10K': '10 km',
  'Half-Marathon': 'Half marathon',
  Marathon: 'Marathon',
};
// The latest few years, so the table fits a phone.
const YEAR_COUNT = 4;

/** The fastest time over each distance, year by year, from Strava's best efforts on runs. */
const RunBestTimes = () => {
  const {activityMeta} = useActivityMeta();
  const {years, rows} = useMemo(() => runBestTimes(Object.values(activityMeta)), [activityMeta]);
  const shown = years.slice(0, YEAR_COUNT);

  if (0 === rows.length) return <Text color="fg.muted">No run with Strava's best efforts yet.</Text>;

  return (
    <Box overflowX="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Distance</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Best</Table.ColumnHeader>
            {shown.map(year => (
              <Table.ColumnHeader key={year} textAlign="end">
                {year}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map(({distance, byYear, best}) => (
            <Table.Row key={distance}>
              <Table.Cell>{DISTANCE_NAMES[distance] ?? distance}</Table.Cell>
              <Table.Cell textAlign="end" fontFamily="figure" fontWeight="semibold">
                {best && (
                  <Link to={`/activities/${best.id}`}>
                    {raceTime(best.seconds)}{' '}
                    <Text as="span" color="fg.muted" fontWeight="normal" fontSize="xs">
                      {best.year}
                    </Text>
                  </Link>
                )}
              </Table.Cell>
              {shown.map(year => {
                const time = byYear[year];
                return (
                  <Table.Cell
                    key={year}
                    textAlign="end"
                    fontFamily="figure"
                    color={time && best && time.seconds === best.seconds ? 'brand.fg' : undefined}
                  >
                    {time ? (
                      <Link to={`/activities/${time.id}`}>{raceTime(time.seconds)}</Link>
                    ) : (
                      <Text as="span" color="fg.subtle">
                        ·
                      </Text>
                    )}
                  </Table.Cell>
                );
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
};

export {RunBestTimes};
