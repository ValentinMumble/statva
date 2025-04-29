import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes as RouterRoutes, Route} from 'react-router';
import {injectSpeedInsights} from '@vercel/speed-insights';
import {ChakraProvider, defaultSystem} from '@chakra-ui/react';
import {ThemeProvider} from 'next-themes';
import {AddCheckIn, App, Routes} from './pages';
import {Toaster} from './components/ui';
import {PageTitle} from './components';
import {ActivitiesProvider, ActivityMetaProvider, AthleteProvider, EnvProvider, LabelProvider} from './providers';

injectSpeedInsights();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ChakraProvider value={defaultSystem}>
    <ThemeProvider enableSystem={true} attribute="class" defaultTheme="system">
      <EnvProvider>
        <LabelProvider>
          <BrowserRouter>
            <RouterRoutes>
              <Route
                path="/"
                element={
                  <AthleteProvider>
                    <ActivityMetaProvider>
                      <ActivitiesProvider>
                        <PageTitle title="Statva 📈" />
                        <App />
                      </ActivitiesProvider>
                    </ActivityMetaProvider>
                  </AthleteProvider>
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
        </LabelProvider>
      </EnvProvider>
    </ThemeProvider>
  </ChakraProvider>
);
