import {ReactNode} from 'react';
import {Button, Center, Heading, Spinner, Stack, Text} from '@chakra-ui/react';
import {enterDemo} from '../demo/mode';
import {useBrowserCache, useSession} from '../hooks';

const STRAVA_ORANGE = '#FC4C02';

// Why Strava sent the rider back without logging them in, from `?login=` on the way back.
const REASONS: Record<string, string> = {
  'not-allowed': 'This Strava account is not on the list for this copy of Statva.',
  scope: 'Statva needs to read your private activities and your profile. Leave every box ticked on Strava’s page.',
  denied: 'Strava did not give access.',
  expired: 'The login took too long. Try again.',
};

/** Shows the page only to a logged-in rider, and a Connect with Strava screen to anyone else. */
const AuthGate = ({children}: {children: ReactNode}) => {
  const {isLoggedIn, isLoading, athleteId} = useSession();
  // The data kept from the last visit is put in place before any page asks for it.
  const cacheReady = useBrowserCache(athleteId);
  const reason = REASONS[new URLSearchParams(window.location.search).get('login') ?? ''];

  if (isLoading || !cacheReady) {
    return (
      <Center height="100dvh">
        <Spinner />
      </Center>
    );
  }

  if (isLoggedIn) return children;

  return (
    <Center height="100dvh" padding="16px">
      <Stack gap="16px" alignItems="center" textAlign="center" maxWidth="360px">
        <Heading size="2xl">Statva 📈</Heading>
        <Text color="fg.muted">Your Strava rides, bike parts and maintenance, in one place.</Text>
        {undefined !== reason && <Text color="orange.fg">{reason}</Text>}
        <Button asChild={true} size="lg" background={STRAVA_ORANGE} color="white" _hover={{opacity: 0.9}}>
          <a href="/api/auth/login">Connect with Strava</a>
        </Button>
        <Button variant="ghost" size="sm" onClick={enterDemo}>
          Try the demo, no account needed
        </Button>
      </Stack>
    </Center>
  );
};

export {AuthGate};
