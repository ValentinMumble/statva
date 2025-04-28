import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router';
import {injectSpeedInsights} from '@vercel/speed-insights';
import {ChakraProvider, defaultSystem} from '@chakra-ui/react';
import {ThemeProvider} from 'next-themes';
import {Toaster} from './components/ui';
import {AddCheckIn, App, Routes as UserRoutes} from './pages';
import {ActivitiesProvider, ActivityMetaProvider, AthleteProvider, EnvProvider, LabelProvider} from './providers';

injectSpeedInsights();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ChakraProvider value={defaultSystem}>
    <ThemeProvider enableSystem={true} attribute="class" defaultTheme="system">
      <EnvProvider>
        <LabelProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <AthleteProvider>
                    <ActivityMetaProvider>
                      <ActivitiesProvider>
                        <App />
                      </ActivitiesProvider>
                    </ActivityMetaProvider>
                  </AthleteProvider>
                }
              />
              <Route path="/routes/:routeId?" element={<UserRoutes />} />
              <Route path="/check-in" element={<AddCheckIn />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </LabelProvider>
      </EnvProvider>
    </ThemeProvider>
  </ChakraProvider>
);
