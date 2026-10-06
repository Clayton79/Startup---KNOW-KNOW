import '@fontsource-variable/plus-jakarta-sans';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import { App } from '@/app/app';
import { ConfigErrorScreen } from '@/app/config-error-screen';
import { envProblems } from '@/lib/env';

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado.');

createRoot(container).render(
  <StrictMode>
    {envProblems.length > 0 ? <ConfigErrorScreen problems={envProblems} /> : <App />}
  </StrictMode>,
);
