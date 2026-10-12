import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes as RouterRoutes, Route} from 'react-router';
import {ChakraProvider, defaultSystem} from '@chakra-ui/react';
import {ThemeProvider} from 'next-themes';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {AddCheckIn, App, Dashboard, Routes, Workshop} from './pages';
import {Toaster} from './components/ui';
import {AuthGate, PageTitle} from './components';

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
  <ChakraProvider value={defaultSystem}>
    <ThemeProvider enableSystem={true} attribute="class" defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
            <RouterRoutes>
              <Route
                path="/"
                element={
                  <AuthGate>
                    <PageTitle title="Statva 📈" />
                    <App />
                  </AuthGate>
                }
              />
              <Route
                path="/routes/:routeId?"
                element={
                  <>
                    <PageTitle title="Statva route" />
                    <Routes />
                  </>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <AuthGate>
                    <Dashboard />
                  </AuthGate>
                }
              />
              <Route
                path="/workshop"
                element={
                  <AuthGate>
                    <Workshop />
                  </AuthGate>
                }
              />
              <Route
                path="/check-in"
                element={
                  <AuthGate>
                    <PageTitle title="Statva check-in" />
                    <AddCheckIn />
                  </AuthGate>
                }
              />
            </RouterRoutes>
            <Toaster />
          </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </ChakraProvider>
);
