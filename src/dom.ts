export type QueryRoot = Document | ShadowRoot;
export interface Boundary { kind: 'shadow' | 'frame'; selector: string; page?: string }

export function isElement(value: unknown): value is Element {
  return !!value && typeof value === 'object' && (value as Node).nodeType === 1;
}

export function parentAcross(element: Element): Element | null {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode() as ShadowRoot;
  if (root.host) return root.host;
  try { return element.ownerDocument.defaultView?.frameElement ?? null; } catch { return null; }
}

export function closestAcross(element: Element, selector: string): Element | null {
  for (let current: Element | null = element; current; current = parentAcross(current)) if (current.matches(selector)) return current;
  return null;
}

export function routeKey(location: Location | URL, hash = true): string {
  const route = hash && /^#!?\//.test(location.hash) ? location.hash.split('?')[0] : '';
  return location.origin + location.pathname + route;
}

export function boundariesFor(element: Element, selectorFor: (element: Element) => string): Boundary[] {
  const path: Boundary[] = [];
  let current = element;
  for (let depth = 0; depth < 16; depth++) {
    const root = current.getRootNode() as QueryRoot;
    if ('host' in root) {
      path.unshift({ kind: 'shadow', selector: selectorFor(root.host) }); current = root.host;
    } else {
      const view = current.ownerDocument.defaultView;
      if (!view || view === window) break;
      try {
        const frame = view.frameElement;
        if (!frame) break;
        path.unshift({ kind: 'frame', selector: selectorFor(frame), page: routeKey(view.location) }); current = frame;
      } catch { break; }
    }
  }
  return path;
}

export function rootFor(document: Document, path: Boundary[] = []): QueryRoot | undefined {
  let root: QueryRoot = document;
  for (const boundary of path) {
    const matches: NodeListOf<Element> = root.querySelectorAll(boundary.selector);
    if (matches.length !== 1) return;
    if (boundary.kind === 'shadow') {
      if (!matches[0].shadowRoot) return;
      root = matches[0].shadowRoot;
    } else {
      try {
        const child = (matches[0] as HTMLIFrameElement).contentDocument;
        if (!child?.defaultView || (boundary.page && routeKey(child.defaultView.location) !== boundary.page)) return;
        root = child;
      } catch { return; }
    }
  }
  return root;
}

export function hostPoint(document: Document, x: number, y: number) {
  let scaleX = 1, scaleY = 1;
  let visible = true;
  for (let depth = 0; document !== window.document && depth < 16; depth++) {
    try {
      const frame = document.defaultView?.frameElement as HTMLElement | null;
      if (!frame) return { x, y, scaleX, scaleY, visible: false };
      const rect = frame.getBoundingClientRect();
      const transform = frame.ownerDocument.defaultView!.getComputedStyle(frame).transform;
      if (transform !== 'none') {
        const matrix = new DOMMatrixReadOnly(transform);
        if (Math.abs(matrix.b) > .001 || Math.abs(matrix.c) > .001 || !matrix.is2D) visible = false;
      }
      visible &&= x >= 0 && y >= 0 && x <= frame.clientWidth && y <= frame.clientHeight;
      const sx = rect.width / (frame.offsetWidth || 1), sy = rect.height / (frame.offsetHeight || 1);
      x = rect.left + (frame.clientLeft + x) * sx; y = rect.top + (frame.clientTop + y) * sy;
      scaleX *= sx; scaleY *= sy; document = frame.ownerDocument;
    } catch { visible = false; break; }
  }
  return { x, y, scaleX, scaleY, visible };
}

export function hostRect(element: Element) {
  const rect = element.getBoundingClientRect();
  const origin = hostPoint(element.ownerDocument, rect.left, rect.top);
  const center = hostPoint(element.ownerDocument, rect.left + rect.width / 2, rect.top + rect.height / 2);
  const width = rect.width * origin.scaleX, height = rect.height * origin.scaleY;
  const clip = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  let visible = center.visible;
  for (let current: Element | null = element, depth = 0; current && depth < 64; current = parentAcross(current), depth++) {
    const style = current.ownerDocument.defaultView!.getComputedStyle(current);
    if (style.display === 'none' || style.opacity === '0' || style.contentVisibility === 'hidden' || (current === element && ['hidden', 'collapse'].includes(style.visibility))) visible = false;
    if (current === element) continue;
    const clipsX = current.localName === 'iframe' || /^(hidden|clip|auto|scroll)$/.test(style.overflowX);
    const clipsY = current.localName === 'iframe' || /^(hidden|clip|auto|scroll)$/.test(style.overflowY);
    if (!clipsX && !clipsY) continue;
    const box = current.getBoundingClientRect(), html = current as HTMLElement;
    const sx = box.width / (html.offsetWidth || box.width || 1), sy = box.height / (html.offsetHeight || box.height || 1);
    const a = hostPoint(current.ownerDocument, box.left + current.clientLeft * sx, box.top + current.clientTop * sy);
    const b = hostPoint(current.ownerDocument, box.left + (current.clientLeft + current.clientWidth) * sx, box.top + (current.clientTop + current.clientHeight) * sy);
    if (clipsX) { clip.left = Math.max(clip.left, a.x); clip.right = Math.min(clip.right, b.x); }
    if (clipsY) { clip.top = Math.max(clip.top, a.y); clip.bottom = Math.min(clip.bottom, b.y); }
  }
  visible &&= Math.min(origin.x + width, clip.right) > Math.max(origin.x, clip.left) && Math.min(origin.y + height, clip.bottom) > Math.max(origin.y, clip.top);
  return { left: origin.x, top: origin.y, width, height, right: origin.x + width, bottom: origin.y + height, visible, clip };
}

/** Observe only accessible roots. No patching of application prototypes or timers. */
export function watchContexts(host: HTMLElement, attach: (document: Document) => () => void, changed: (roots: QueryRoot[]) => void): () => void {
  const roots = new Map<QueryRoot, { observer: MutationObserver; detach?: () => void; page?: string }>();
  let queued = false, disposed = false;
  const notify = () => changed([...roots.keys()]);
  const queue = () => { notify(); if (!queued) { queued = true; queueMicrotask(scan); } };
  function scan() {
    queued = false;
    if (disposed) return;
    const seen = new Set<QueryRoot>();
    function visit(root: QueryRoot, depth: number) {
      if (depth > 16 || seen.has(root)) return;
      seen.add(root);
      let entry = roots.get(root);
      if (!entry) {
        const observer = new MutationObserver(queue);
        observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
        const loaded = (event: Event) => { if (isElement(event.target) && event.target.localName === 'iframe') queue(); };
        root.addEventListener('load', loaded, true);
        const detach = root.nodeType === 9 ? attach(root as Document) : undefined;
        entry = { observer, detach: () => { detach?.(); root.removeEventListener('load', loaded, true); } };
        roots.set(root, entry);
      }
      if (root.nodeType === 9) {
        try {
          const page = routeKey((root as Document).defaultView!.location);
          if (entry.page !== page) { entry.page = page; notify(); }
        } catch { /* A formerly accessible frame may have navigated away. */ }
      }
      for (const element of root.querySelectorAll('*')) {
        if (element === host) continue;
        if (element.shadowRoot) visit(element.shadowRoot, depth + 1);
        if (element.localName === 'iframe') {
          try { const child = (element as HTMLIFrameElement).contentDocument; if (child) visit(child, depth + 1); } catch { /* Cross-origin frames stay opaque. */ }
        }
      }
    }
    visit(document, 0);
    for (const [root, entry] of roots) if (!seen.has(root)) { entry.observer.disconnect(); entry.detach?.(); roots.delete(root); }
    notify();
  }
  scan();
  const interval = window.setInterval(scan, 750);
  return () => { disposed = true; clearInterval(interval); for (const entry of roots.values()) { entry.observer.disconnect(); entry.detach?.(); } roots.clear(); };
}
