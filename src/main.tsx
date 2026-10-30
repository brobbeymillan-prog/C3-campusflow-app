import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWAUpdater } from './utils/pwaUpdater.ts';

// Initialize PWA auto-updater so changes reflect seamlessly in installed apps
initPWAUpdater();

createRoot(document.getElementById('root')!).render(<App />);
