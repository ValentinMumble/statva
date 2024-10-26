import ReactDOM from 'react-dom/client';
import {App} from './App.tsx';
import {ActivitiesProvider, AthleteProvider} from './providers';
import {Provider} from './components/ui/provider';

// const config: ThemeConfig = {
//   initialColorMode: 'system',
//   useSystemColorMode: true,
// };

// const theme = extendTheme({
//   semanticTokens: {
//     colors: {
//       'chakra-body-text': {
//         _dark: 'gray.200',
//       },
//     },
//   },
//   config,
// });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider>
    <AthleteProvider>
      <ActivitiesProvider>
        {/* <ColorModeScript initialColorMode={theme.config.initialColorMode} /> */}
        <App />
      </ActivitiesProvider>
    </AthleteProvider>
  </Provider>
);
