import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router';
import {injectSpeedInsights} from '@vercel/speed-insights';
import {Provider, Toaster} from './components/ui';
import {AddCheckIn, App, Routes as UserRoutes} from './pages';
import {ActivitiesProvider, ActivityMetaProvider, AthleteProvider, EnvProvider, LabelProvider} from './providers';

injectSpeedInsights();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider>
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
                      <Toaster />
                      <App />
                    </ActivitiesProvider>
                  </ActivityMetaProvider>
                </AthleteProvider>
              }
            />
            <Route path="/routes/:routeId?" element={<UserRoutes />} />
            <Route path='/check-in' element={<AddCheckIn />} />
          </Routes>
        </BrowserRouter>
      </LabelProvider>
    </EnvProvider>
  </Provider>
);
