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

/**
 * The one place to move between pages and to log an event, whatever page you are on. On a
 * phone it sits at the bottom, where the thumb is, and the page keeps the same height free
 * for it at the bottom instead of the top.
 */
const TopBar = () => {
  const {pathname} = useLocation();
  const {refetch: refreshEvents} = useEvents();

  return (
    <HStack
      height={TOP_BAR_HEIGHT}
      paddingX={['8px', '20px']}
      gap="4px"
      position={['fixed', 'static']}
      bottom="0"
      left="0"
      right="0"
      zIndex="sticky"
      background="bg"
      borderTopWidth={['1px', '0']}
      borderBottomWidth={['0', '1px']}
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
            paddingX={['6px', '12px']}
            fontSize={['xs', 'sm']}
          >
            <Link to={to}>
              <Span fontWeight={pathname === to ? 'semibold' : 'normal'}>{label}</Span>
            </Link>
          </Button>
        ))}
      </Group>
      <Group gap="4px">
        <Group hideBelow="md">
          <EditLabels />
        </Group>
        <LogEvent
          onLogged={refreshEvents}
          trigger={
            <Button size="sm" variant={{base: 'solid', md: 'surface'}} paddingX="16px">
              Log
            </Button>
          }
        />
      </Group>
    </HStack>
  );
};

export {TopBar, TOP_BAR_HEIGHT};
