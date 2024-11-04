import ReactDOM from 'react-dom/client';
import {App} from './App.tsx';
import {ActivitiesProvider, AthleteProvider} from './providers';
import {Provider, Toaster} from './components/ui';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider>
    <AthleteProvider>
      <ActivitiesProvider>
        <Toaster />
        <App />
      </ActivitiesProvider>
    </AthleteProvider>
  </Provider>
);
