/** Browser boundaries deliberately have no fabricated source metadata. */
export function mountLabBoundaries(container: HTMLElement): () => void {
  const shadowHost = document.createElement('div'); shadowHost.id = 'lab-shadow';
  const shadow = shadowHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<style>button{padding:12px;margin:6px;border:1px solid #ddd;border-radius:8px;background:#f6f4ed}</style><button>Shadow action</button><button>Shadow action</button>';
  const frame = document.createElement('iframe'); frame.id = 'lab-frame'; frame.title = 'Same-origin test frame';
  frame.srcdoc = '<style>body{font:14px system-ui;padding:16px}button{padding:12px;border-radius:8px}</style><button id="frame-action">Frame action</button>';
  container.append(shadowHost, frame);
  return () => { shadowHost.remove(); frame.remove(); };
}
