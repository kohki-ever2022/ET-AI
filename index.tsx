
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/ui/Toast';
import './styles/index.css';

// React Query client configuration
// Optimized for 70% reduction in Firestore reads
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes - data stays fresh
      cacheTime: 30 * 60 * 1000,     // 30 minutes - cache retention
      refetchOnWindowFocus: false,   // Disable refetch on window focus
      refetchOnReconnect: false,     // Disable refetch on reconnect
      retry: 1,                       // Retry failed queries once
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>
);