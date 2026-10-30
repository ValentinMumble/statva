import {MouseEvent, useState} from 'react';
import {Box, Button, Flex, HStack, Icon, IconButton, Stack, Text} from '@chakra-ui/react';
import {Link, Outlet, useLocation} from 'react-router';
import {useQueryClient} from '@tanstack/react-query';
import {LuLogOut, LuPlus, LuRefreshCw, LuX} from 'react-icons/lu';
import {forgetCachedData} from '../api';
import {toaster} from '../components/ui';
import {LogEvent} from '../components/event';
import {leaveDemo} from '../demo/mode';
import {useAllActivities, useAthlete, useEvents, useSession, useSettings} from '../hooks';
import {hasEmoji} from '../models';
import {Activity} from '../models/strava';
import {isActive, NAV, navFor} from './nav';

const SIDEBAR_WIDTH = '232px';
// About the 62 pt of iOS 26's tab bar.
const TAB_BAR_HEIGHT = '62px';
// The floating tab bar sits this far above the home indicator, as in the hk and chords apps.
const TAB_BAR_GAP = '8px';
// Its sides, kept clear of the rounded corners and of the notch in landscape.
const TAB_BAR_SIDE = '14px';

// The activities this browser keeps go first, so the next person on it does not see them.
const logOut = async (event: MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  const {href} = event.currentTarget;
  await forgetCachedData();
  window.location.assign(href);
};

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

/** Asks Strava for anything new now, rather than waiting for the next visit or the webhook. */
const RefreshButton = ({compact = false}: {compact?: boolean}) => {
  const {data, refreshLatest} = useAllActivities();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    const before = new Set((data ?? []).map(({id}) => id));

    try {
      await refreshLatest();
      const added = (queryClient.getQueryData<Activity[]>(['activities']) ?? []).filter(
        ({id}) => !before.has(id),
      ).length;
      toaster.create({title: 0 === added ? 'Up to date' : `${added} new ${1 === added ? 'activity' : 'activities'}`});
    } finally {
      setRefreshing(false);
    }
  };

  return compact ? (
    <IconButton
      aria-label="Check Strava for new activities"
      size="sm"
      variant="ghost"
      onClick={handleRefresh}
      loading={refreshing}
    >
      <LuRefreshCw />
    </IconButton>
  ) : (
    <Button
      variant="outline"
      width="full"
      borderRadius="10px"
      onClick={handleRefresh}
      loading={refreshing}
      loadingText="Checking Strava"
    >
      <LuRefreshCw /> Refresh
    </Button>
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
          <a href="/api/auth/logout" onClick={logOut}>
            <LuLogOut />
          </a>
        </IconButton>
      )}
    </HStack>
  );
};

/** How many activities still have no emoji in their name, for riders who tag them with one. */
const useUnprocessedCount = (): number => {
  const {unprocessedEmoji} = useSettings();
  const {data} = useAllActivities();

  return unprocessedEmoji ? (data ?? []).filter(({name}) => !hasEmoji(name)).length : 0;
};

const useNav = () => navFor(useSettings().club?.name || null);

const Sidebar = () => {
  const {pathname} = useLocation();
  const unprocessed = useUnprocessedCount();
  const nav = useNav();

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
        Statva{' '}
        <Box as="span" color="brand.solid">
          🛹
        </Box>
      </Text>
      <Stack gap="2px" flex="1">
        {nav.map(({to, label, icon}) => {
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
                {'/activities' === to && 0 < unprocessed && (
                  <Text
                    as="span"
                    marginLeft="auto"
                    fontSize="xs"
                    fontWeight="semibold"
                    color="brand.contrast"
                    background="brand.solid"
                    borderRadius="full"
                    paddingX="7px"
                    lineHeight="18px"
                    title={`${unprocessed} without an emoji`}
                  >
                    {unprocessed}
                  </Text>
                )}
              </HStack>
            </Link>
          );
        })}
      </Stack>
      <Stack gap="16px">
        <Stack gap="8px">
          <RefreshButton />
          <LogButton />
        </Stack>
        <AccountRow />
      </Stack>
    </Stack>
  );
};

const PhoneHeader = () => {
  const {pathname} = useLocation();
  const nav = useNav();
  const current = nav.find(({to}) => isActive(to, pathname));

  return (
    <HStack
      hideFrom="md"
      justifyContent="space-between"
      paddingX="16px"
      // The page runs under the status bar (viewport-fit=cover): the header keeps clear of it.
      paddingTop="calc(10px + env(safe-area-inset-top))"
      paddingBottom="10px"
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
        {nav
          .filter(({onPhone}) => !onPhone)
          .map(({to, label, icon}) => (
            <IconButton key={to} aria-label={label} size="sm" variant="ghost" asChild={true}>
              <Link to={to}>
                <Icon as={icon} />
              </Link>
            </IconButton>
          ))}
        <RefreshButton compact={true} />
        <LogButton compact={true} />
      </HStack>
    </HStack>
  );
};

/**
 * The phone tab bar, in the style of iOS's Liquid Glass, the same recipe as Chords' and Tillroll's:
 * a floating capsule of frosted, see-through glass with a light top edge, a hairline outline and a
 * soft shadow, and a glass lens that slides under the current tab.
 */
const TabBar = () => {
  const {pathname} = useLocation();
  const unprocessed = useUnprocessedCount();
  const tabs = NAV.filter(({onPhone}) => onPhone);
  // A page with no tab of its own (an activity) has no lens.
  const current = tabs.findIndex(({to}) => isActive(to, pathname));

  return (
    <HStack
      as="nav"
      hideFrom="md"
      position="fixed"
      bottom={`calc(${TAB_BAR_GAP} + env(safe-area-inset-bottom))`}
      left={`max(${TAB_BAR_SIDE}, env(safe-area-inset-left))`}
      right={`max(${TAB_BAR_SIDE}, env(safe-area-inset-right))`}
      zIndex="sticky"
      height={TAB_BAR_HEIGHT}
      padding="5px"
      gap="2px"
      borderRadius="full"
      background={{base: 'rgba(242, 242, 247, 0.72)', _dark: 'rgba(22, 22, 24, 0.7)'}}
      backdropFilter="blur(24px) saturate(180%)"
      boxShadow={{
        base: 'inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 0 0 0.5px rgba(0, 0, 0, 0.1), 0 10px 30px rgba(0, 0, 0, 0.14)',
        _dark:
          'inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 0 0 0.5px rgba(255, 255, 255, 0.1), 0 10px 30px rgba(0, 0, 0, 0.5)',
      }}
    >
      {0 <= current && (
        // One tab wide: the bar minus its padding and gaps, split by the number of tabs.
        <Box
          aria-hidden
          position="absolute"
          top="5px"
          bottom="5px"
          left="5px"
          width={`calc((100% - 10px - ${(tabs.length - 1) * 2}px) / ${tabs.length})`}
          borderRadius="full"
          background={{base: 'rgba(118, 118, 128, 0.16)', _dark: 'rgba(118, 118, 128, 0.24)'}}
          boxShadow={{base: 'inset 0 1px 0 rgba(255, 255, 255, 0.5)', _dark: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)'}}
          transform={`translateX(calc(${current} * (100% + 2px)))`}
          transition="transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)"
          _motionReduce={{transition: 'none'}}
        />
      )}
      {tabs.map(({to, label, icon}) => {
        const active = isActive(to, pathname);

        return (
          <Link
            key={to}
            to={to}
            // Another tab opens at the top, rather than where the last page was scrolled to.
            state={{fromTab: true}}
            style={{flex: 1, height: '100%', position: 'relative', zIndex: 1}}
            aria-current={active ? 'page' : undefined}
            // Tapping the tab of the page already open scrolls it back to the top, as on iOS,
            // and keeps its filters. From a page under it (an activity), it goes back as usual.
            onClick={event => {
              if (pathname !== to) {
                window.scrollTo(0, 0);
                return;
              }
              event.preventDefault();
              window.scrollTo({top: 0, behavior: 'smooth'});
            }}
          >
            <Stack
              gap="1px"
              height="full"
              alignItems="center"
              justifyContent="center"
              borderRadius="full"
              color={active ? 'brand.solid' : 'fg'}
              transition="color 200ms ease, transform 200ms ease"
              _active={{transform: 'scale(0.95)'}}
            >
              <Box position="relative">
                <Icon as={icon} boxSize="21px" />
                {'/activities' === to && 0 < unprocessed && (
                  <Box
                    position="absolute"
                    top="-2px"
                    right="-5px"
                    width="9px"
                    height="9px"
                    borderRadius="full"
                    background="brand.solid"
                    boxShadow="0 0 0 2px var(--chakra-colors-bg-panel)"
                    aria-label={`${unprocessed} without an emoji`}
                  />
                )}
              </Box>
              <Text fontSize="10px" fontWeight={active ? 'semibold' : 'medium'} lineHeight="1.1">
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
      <Box
        flex="1"
        minWidth="0"
        paddingBottom={{base: `calc(${TAB_BAR_HEIGHT} + ${TAB_BAR_GAP} + env(safe-area-inset-bottom) + 16px)`, md: '0'}}
      >
        <PhoneHeader />
        <Box
          as="main"
          maxWidth="1600px"
          marginX="auto"
          paddingX={{base: '16px', md: '32px'}}
          paddingY={{base: '16px', md: '32px'}}
        >
          <Outlet key={profileKey} />
        </Box>
      </Box>
      <TabBar />
    </Flex>
  );
};

export {AppShell};
