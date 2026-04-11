import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import App from './App.tsx';
import './index.css';

// Initialize Capacitor plugins
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

// Handle Android back button
CapApp.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack) {
    CapApp.exitApp();
  } else {
    window.history.back();
  }
});

// Set status bar style
StatusBar.setStyle({ style: Style.Light }).catch(() => {
  // Running in browser, StatusBar not available
});
StatusBar.setBackgroundColor({ color: '#16a34a' }).catch(() => {
  // Running in browser, StatusBar not available
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
