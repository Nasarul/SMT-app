import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './index.css';

// Handle chunk load errors caused by deployment updates
window.addEventListener('error', (event) => {
  if (event.message && (event.message.includes('Loading chunk') || event.message.includes('dynamically imported module'))) {
    console.warn('Chunk loading error detected, reloading page...');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

