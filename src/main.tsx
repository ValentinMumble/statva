import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes as RouterRoutes, Route} from 'react-router';
import {injectSpeedInsights} from '@vercel/speed-insights';
import {ChakraProvider, defaultSystem} from '@chakra-ui/react';
import {ThemeProvider} from 'next-themes';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {AddCheckIn, App, Routes} from './pages';
import {Toaster} from './components/ui';
import {PageTitle} from './components';
injectSpeedInsights();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
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
                  <>
                    <PageTitle title="Statva 📈" />
                    <App />
                  </>
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
                path="/check-in"
                element={
                  <>
                    <PageTitle title="Statva check-in" />
                    <AddCheckIn />
                  </>
                }
              />
            </RouterRoutes>
            <Toaster />
          </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </ChakraProvider>
);
