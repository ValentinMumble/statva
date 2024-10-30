import ReactDOM from 'react-dom/client';
import {App} from './App.tsx';
import {ActivitiesProvider, AthleteProvider} from './providers';
import {Provider} from './components/ui/provider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider>
    <AthleteProvider>
      <ActivitiesProvider>
        <App />
      </ActivitiesProvider>
    </AthleteProvider>
  </Provider>
);
