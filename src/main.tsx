import ReactDOM from 'react-dom/client';
import {injectSpeedInsights} from '@vercel/speed-insights';
import {Provider, Toaster} from './components/ui';
import {App} from './App.tsx';
import {ActivitiesProvider, ActivityMetaProvider, AthleteProvider, EnvProvider, LabelProvider} from './providers';

injectSpeedInsights();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider>
    <EnvProvider>
      <LabelProvider>
        <AthleteProvider>
          <ActivityMetaProvider>
            <ActivitiesProvider>
              <Toaster />
              <App />
            </ActivitiesProvider>
          </ActivityMetaProvider>
        </AthleteProvider>
      </LabelProvider>
    </EnvProvider>
  </Provider>
);
