// index.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initMonitoring } from './src/services/core/monitoring';
import { AppErrorBoundary } from './src/components/ErrorBoundary';

initMonitoring();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
