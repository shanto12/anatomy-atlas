import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/inter';

import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/pages.css';
import './styles/viewer.css';
import './styles/learn.css';

import App from './App';
import { ProgressProvider } from './lib/progress';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProgressProvider>
        <App />
      </ProgressProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Fade out the static boot screen once React has painted.
requestAnimationFrame(() => {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.add('boot--done');
  window.setTimeout(() => boot.remove(), 500);
});
