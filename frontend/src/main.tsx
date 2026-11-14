import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';
import { aplicarTemaInicial } from './shared/components/layout/tema';

aplicarTemaInicial();

const contenedor = document.getElementById('root');

if (!contenedor) {
  throw new Error('No se encontro el elemento root');
}

createRoot(contenedor).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
