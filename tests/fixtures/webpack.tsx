import { createRoot } from 'react-dom/client';
import { Noktiq } from 'noktiq/react';
createRoot(document.getElementById('root')!).render(<main style={{ padding: 60 }}>
  <button id="webpack-target">Webpack source target</button>
  <Noktiq enabled={process.env.NODE_ENV === 'development'} />
</main>);
