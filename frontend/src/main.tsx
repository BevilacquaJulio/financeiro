import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './styles/tokens.css';
import './styles/theme.css';

import App from './App';
import { SessionProvider } from './lib/session';
import { UiProvider } from './components/UiProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 15_000,
    },
  },
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UiProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </UiProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
