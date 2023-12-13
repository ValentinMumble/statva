import React from 'react';
import ReactDOM from 'react-dom/client';
import {ChakraProvider, ThemeConfig, extendTheme} from '@chakra-ui/react';
import {ActivitiesProvider} from './providers';
import {App} from './App.tsx';
import './index.css';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({config});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ActivitiesProvider>
        <App />
      </ActivitiesProvider>
    </ChakraProvider>
  </React.StrictMode>
);
