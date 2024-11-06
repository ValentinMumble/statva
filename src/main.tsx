import {BrowserRouter, Route, Routes} from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import {injectSpeedInsights} from '@vercel/speed-insights';
import {Provider, Toaster} from './components/ui';
import {App} from './App.tsx';
import {Export} from './Export.tsx';
import {ActivitiesProvider, AthleteProvider, LabelProvider} from './providers';

injectSpeedInsights();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider>
    <LabelProvider>
      <AthleteProvider>
        <ActivitiesProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/export" element={<Export />} />
            </Routes>
          </BrowserRouter>
        </ActivitiesProvider>
      </AthleteProvider>
    </LabelProvider>
  </Provider>
);
