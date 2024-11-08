import ReactDOM from 'react-dom/client';
import {injectSpeedInsights} from '@vercel/speed-insights';
import {Provider, Toaster} from './components/ui';
import {App} from './App.tsx';
import {ActivitiesProvider, AthleteProvider, EnvProvider, LabelProvider} from './providers';

injectSpeedInsights();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider>
    <EnvProvider>
      <LabelProvider>
        <AthleteProvider>
          <ActivitiesProvider>
            <Toaster />
            <App />
          </ActivitiesProvider>
        </AthleteProvider>
      </LabelProvider>
    </EnvProvider>
  </Provider>
);
