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
import {BikePage} from './app/pages/BikePage';
import {HomePage} from './app/pages/HomePage';
import {RecordsPage} from './app/pages/RecordsPage';
import {SettingsPage} from './app/pages/SettingsPage';
import {StatsPage} from './app/pages/StatsPage';
import {system} from './app/theme';

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
              <Route path="bike/:bikeId?" element={<BikePage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="records" element={<RecordsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>


          </RouterRoutes>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </ChakraProvider>,
);
