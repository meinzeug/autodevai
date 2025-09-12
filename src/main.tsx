import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/globals.css';
import { performanceMonitor, registerServiceWorker } from './utils/performance';

// Initialize performance monitoring
performanceMonitor;

// Register service worker
registerServiceWorker().then((registration) => {
  if (registration) {
    console.log('Service Worker registered successfully');
  }
});

// Listen for service worker updates
window.addEventListener('sw-update-available', (event) => {
  const detail = (event as CustomEvent).detail;
  console.log('Service Worker update available');
  
  // You could show a toast notification here
  if (confirm('A new version is available. Reload to update?')) {
    if (detail.registration.waiting) {
      detail.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);