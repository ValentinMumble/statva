import {Box, Button, Flex, HStack, Icon, IconButton, Stack, Text} from '@chakra-ui/react';
import {Link, Outlet, useLocation} from 'react-router';
import {LuLogOut, LuPlus, LuX} from 'react-icons/lu';
import {LogEvent} from '../components/event';
import {leaveDemo} from '../demo/mode';
import {useAthlete, useEvents, useSession, useSettings} from '../hooks';
import {isActive, NAV} from './nav';

const SIDEBAR_WIDTH = '232px';
const TAB_BAR_HEIGHT = '64px';

const LogButton = ({compact = false}: {compact?: boolean}) => {
  const {refetch} = useEvents();

  return (
    <LogEvent
      onLogged={refetch}
      trigger={
        compact ? (
          <IconButton aria-label="Log an event" size="sm" colorPalette="brand" borderRadius="full">
            <LuPlus />
          </IconButton>
        ) : (
          <Button colorPalette="brand" width="full" borderRadius="10px">
            <LuPlus /> Log an event
          </Button>
        )
      }
    />
  );
};

const AccountRow = () => {
  const athlete = useAthlete();
  const {isDemo} = useSession();

  return (
    <HStack justifyContent="space-between" gap="8px" paddingX="8px">
      <Stack gap="0" minWidth="0">
        <Text fontSize="sm" fontWeight="medium" truncate={true}>
          {athlete ? `${athlete.firstname} ${athlete.lastname}` : ' '}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {isDemo ? 'Demo, made-up data' : 'Connected to Strava'}
        </Text>
      </Stack>
      {isDemo ? (
        <IconButton aria-label="Leave the demo" size="sm" variant="ghost" onClick={leaveDemo}>
          <LuX />
        </IconButton>
      ) : (
        <IconButton aria-label="Log out" size="sm" variant="ghost" asChild={true}>
          <a href="/api/auth/logout">
            <LuLogOut />
          </a>
        </IconButton>
      )}
    </HStack>
  );
};

const Sidebar = () => {
  const {pathname} = useLocation();

  return (
    <Stack
      as="nav"
      hideBelow="md"
      width={SIDEBAR_WIDTH}
      flexShrink={0}
      height="100dvh"
      position="sticky"
      top="0"
      padding="20px 14px"
      gap="24px"
      borderRightWidth="1px"
      background="bg.panel"
    >
      <Text fontFamily="heading" fontWeight="bold" fontSize="xl" paddingX="10px" letterSpacing="-0.02em">
        Statva <Box as="span" color="brand.solid">🛹</Box>
      </Text>
      <Stack gap="2px" flex="1">
        {NAV.map(({to, label, icon}) => {
          const active = isActive(to, pathname);

          return (
            <Link key={to} to={to}>
              <HStack
                gap="12px"
                paddingX="10px"
                paddingY="8px"
                borderRadius="10px"
                fontSize="sm"
                fontWeight={active ? 'semibold' : 'medium'}
                color={active ? 'fg' : 'fg.muted'}
                background={active ? 'bg.muted' : 'transparent'}
                _hover={{background: 'bg.subtle', color: 'fg'}}
              >
                <Icon as={icon} boxSize="18px" color={active ? 'brand.solid' : undefined} />
                {label}
              </HStack>
            </Link>
          );
        })}
      </Stack>
      <Stack gap="16px">
        <LogButton />
        <AccountRow />
      </Stack>
    </Stack>
  );
};

const PhoneHeader = () => {
  const {pathname} = useLocation();
  const current = NAV.find(({to}) => isActive(to, pathname));

  return (
    <HStack
      hideFrom="md"
      justifyContent="space-between"
      paddingX="16px"
      paddingY="10px"
      position="sticky"
      top="0"
      zIndex="sticky"
      background="bg/90"
      backdropFilter="blur(12px)"
      borderBottomWidth="1px"
    >
      <Text fontFamily="heading" fontWeight="bold" fontSize="lg">
        {current?.label ?? 'Statva'}
      </Text>
      <HStack gap="4px">
        {NAV.filter(({onPhone}) => !onPhone).map(({to, label, icon}) => (
          <IconButton key={to} aria-label={label} size="sm" variant="ghost" asChild={true}>
            <Link to={to}>
              <Icon as={icon} />
            </Link>
          </IconButton>
        ))}
        <LogButton compact={true} />
      </HStack>
    </HStack>
  );
};

const TabBar = () => {
  const {pathname} = useLocation();

  return (
    <HStack
      as="nav"
      hideFrom="md"
      position="fixed"
      bottom="0"
      left="0"
      right="0"
      zIndex="sticky"
      height={`calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom))`}
      paddingBottom="env(safe-area-inset-bottom)"
      background="bg.panel/95"
      backdropFilter="blur(12px)"
      borderTopWidth="1px"
      justifyContent="space-around"
      gap="0"
    >
      {NAV.filter(({onPhone}) => onPhone).map(({to, label, icon}) => {
        const active = isActive(to, pathname);

        return (
          <Link key={to} to={to} style={{flex: 1}}>
            <Stack gap="2px" alignItems="center" color={active ? 'brand.solid' : 'fg.muted'}>
              <Icon as={icon} boxSize="22px" />
              <Text fontSize="10px" fontWeight={active ? 'semibold' : 'medium'}>
                {label}
              </Text>
            </Stack>
          </Link>
        );
      })}
    </HStack>
  );
};

/** The frame of every page: a side menu on a computer, a header and tab bar on a phone. */
const AppShell = () => {
  const {heartRate, weightKg, normalizedPowerFromNote} = useSettings();
  // Calculations everywhere read these, so a change redraws the page from scratch.
  const profileKey = JSON.stringify([heartRate, weightKg, normalizedPowerFromNote]);

  return (
    <Flex minHeight="100dvh">
      <Sidebar />
      <Box flex="1" minWidth="0" paddingBottom={{base: `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom) + 16px)`, md: '0'}}>
        <PhoneHeader />
        <Box as="main" maxWidth="1600px" marginX="auto" paddingX={{base: '16px', md: '32px'}} paddingY={{base: '16px', md: '32px'}}>
          <Outlet key={profileKey} />
        </Box>
      </Box>
      <TabBar />
    </Flex>
  );
};

export {AppShell};
