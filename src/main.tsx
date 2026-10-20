import '@fontsource/anton/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource-variable/inter/wght.css';
import './styles/main.scss';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
