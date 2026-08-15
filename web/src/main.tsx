import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted, so the archive makes no third-party request on load. It is
// noindexed to keep ~100 real Discord handles out of search results; sending
// every reader's IP and referrer to a font CDN to render the page undoes a
// good part of that. These ship from our own origin instead.
//
// Only the weights the stylesheets actually ask for: 400, 600 and 700, plus
// EB Garamond's italic. The old Google request also fetched Cinzel 500, which
// nothing uses.
//
// Latin and latin-ext only. The bare `400.css` entrypoints pull greek, cyrillic
// and vietnamese too — never downloaded, since each @font-face carries its
// unicode-range, but every one of them is built, hashed and uploaded. latin-ext
// stays because the roster prints real member names read from the sheet, and
// those are not guaranteed to be unaccented.
import '@fontsource/cinzel/latin-400.css';
import '@fontsource/cinzel/latin-ext-400.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-ext-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/cinzel/latin-ext-700.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-ext-400.css';
import '@fontsource/eb-garamond/latin-600.css';
import '@fontsource/eb-garamond/latin-ext-600.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import '@fontsource/eb-garamond/latin-ext-400-italic.css';

import App from './App';
import './styles/base.css';
import './styles/shelf.css';
import './styles/ledger.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
