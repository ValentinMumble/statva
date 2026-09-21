import {Button, Group, HStack, Span} from '@chakra-ui/react';
import {Link, useLocation} from 'react-router';
import {LogEvent} from './event';
import {EditLabels} from './EditLabels';
import {useEvents} from '../hooks';

const LINKS = [
  {to: '/', label: 'Rides'},
  {to: '/dashboard', label: 'Dashboard'},
  {to: '/workshop', label: 'Workshop'},
  {to: '/routes', label: 'Routes'},
];

const TOP_BAR_HEIGHT = '48px';

/** The one place to move between pages and to log an event, whatever page you are on. */
const TopBar = () => {
  const {pathname} = useLocation();
  const {refetch: refreshEvents} = useEvents();

  return (
    <HStack
      height={TOP_BAR_HEIGHT}
      paddingX={['10px', '20px']}
      gap="4px"
      borderBottomWidth="1px"
      borderColor="border"
      justifyContent="space-between"
    >
      <Group gap="2px">
        {LINKS.map(({to, label}) => (
          <Button
            key={to}
            asChild={true}
            size="sm"
            variant={pathname === to ? 'surface' : 'ghost'}
            paddingX={['8px', '12px']}
          >
            <Link to={to}>
              <Span fontWeight={pathname === to ? 'semibold' : 'normal'}>{label}</Span>
            </Link>
          </Button>
        ))}
      </Group>
      <Group gap="4px">
        <EditLabels />
        <LogEvent
          onLogged={refreshEvents}
          trigger={
            <Button size="sm" variant="surface">
              Log
            </Button>
          }
        />
      </Group>
    </HStack>
  );
};

export {TopBar, TOP_BAR_HEIGHT};
