import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes as RouterRoutes, Route} from 'react-router';
import {ChakraProvider} from '@chakra-ui/react';
import {ThemeProvider} from 'next-themes';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Toaster} from './components/ui';
import {AuthGate, PageTitle} from './components';
import {AppShell} from './app/AppShell';
import {ActivitiesPage} from './app/pages/ActivitiesPage';
import {ActivityPage} from './app/pages/ActivityPage';
import {BikePage, OldBikeLink} from './app/pages/BikePage';
import {ClubPage} from './app/pages/ClubPage';
import {HomePage} from './app/pages/HomePage';
import {RecordsPage} from './app/pages/RecordsPage';
import {RideWeatherPage} from './app/pages/RideWeatherPage';
import {SharedRidePage} from './app/pages/SharedRidePage';
import {SettingsPage} from './app/pages/SettingsPage';
import {StatsPage} from './app/pages/StatsPage';
import {system} from './app/theme';
// Statva's two fonts come with the app, not from Google: no other server holds up the first screen, and they stay on
// the device with the rest of it (see sw/sw.js).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

// A page opened before a deploy asks for chart files the new deploy no longer has: reload
// to get the new ones, rather than leave the page blank. Not twice in a row, so a file that
// is really missing cannot start a reload loop.
const RELOADED_AT_KEY = 'reloaded-for-deploy-at';
const RELOAD_GAP_MS = 10_000;

/** Reloads into the new deploy, unless the page did so in the last 10 seconds. Whether it reloads. */
const reloadForDeploy = (): boolean => {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0) < RELOAD_GAP_MS) return false;
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();

  return true;
};

window.addEventListener('vite:preloadError', event => {
  if (reloadForDeploy()) event.preventDefault();
});

// Statva keeps itself on this device with a service worker (sw/sw.js), so it opens at once, even
// with no network. A new deploy installs in the background, then takes over: the page reloads into
// it at once while nothing was tapped yet, else when it next comes back to the front.
const hasWorker = import.meta.env.PROD && 'serviceWorker' in navigator;
let tapped = false;
let outdated = false;
window.addEventListener('pointerdown', () => (tapped = true), {capture: true, once: true});
if (hasWorker) {
  // The first install takes over a page that is already the live one.
  let controlled = null !== navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true;
      return;
    }
    if (tapped) outdated = true;
    else reloadForDeploy();
  });
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch {
      // No service worker: the app still works, it needs the network to open.
    }
  });
}

// An app on a phone's home screen can sit in memory for days and come back as it was, on an old
// deploy. Each time it comes back to the front (at most once a minute), it looks for a new deploy:
// the service worker checks, or without one, the page is asked for and the app reloads when it
// names another build than the one running.
const RUNNING_BUILD = import.meta.url.match(/\/assets\/index-[^/]+\.js/)?.[0] ?? null;
const BUILD_CHECK_GAP_MS = 60_000;
let checkedBuildAt = 0;
document.addEventListener('visibilitychange', async () => {
  if ('visible' !== document.visibilityState) return;
  if (outdated) {
    reloadForDeploy();
    return;
  }
  if (null === RUNNING_BUILD || Date.now() - checkedBuildAt < BUILD_CHECK_GAP_MS) return;
  checkedBuildAt = Date.now();
  try {
    if (hasWorker) {
      await (await navigator.serviceWorker.getRegistration())?.update();
      return;
    }
    const page = await (await fetch('/', {cache: 'no-store'})).text();
    const live = page.match(/\/assets\/index-[^"']+\.js/)?.[0];
    if (undefined !== live && live !== RUNNING_BUILD) reloadForDeploy();
  } catch {
    // Offline: the next return to the front tries again.
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ChakraProvider value={system}>
    <ThemeProvider enableSystem={true} attribute="class" defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RouterRoutes>
            {/* A ride shared from Ride weather opens for anyone with the link, without a login. */}
            <Route path="w/:shareId" element={<SharedRidePage />} />
            <Route
              element={
                <AuthGate>
                  <PageTitle title="Statva 🛹" />
                  <AppShell />
                </AuthGate>
              }
            >
              <Route index={true} element={<HomePage />} />
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="activities/:activityId" element={<ActivityPage />} />
              <Route path="gear/:bikeId?" element={<BikePage />} />
              <Route path="bike/:bikeId?" element={<OldBikeLink />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="records" element={<RecordsPage />} />
              <Route path="weather" element={<RideWeatherPage />} />
              <Route path="club" element={<ClubPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </RouterRoutes>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </ChakraProvider>,
);
