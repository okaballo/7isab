import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';

// Ask the browser not to evict our IndexedDB (iOS can clear PWA storage otherwise).
navigator.storage?.persist?.().catch(() => {});
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
