import { attributeSelector, detailsFor, identifyingAttributes, locatorFor, styleProperties, type ElementDetails } from './identity.js';
import { boundariesFor, closestAcross, rootFor, routeKey, type Boundary } from './dom.js';
import { validEditor } from './editor.js';

export interface Annotation extends ElementDetails {
  id: string;
  page: string;
  selector: string;
  tag: string;
  text: string;
  selectorStrategy?: 'identity' | 'structure';
  boundaries?: Boundary[];
  kind?: 'element' | 'text' | 'group' | 'area';
  selectedText?: string;
  textRange?: { start: number; end: number; text?: string };
  bounds?: { x: number; y: number; width: number; height: number };
  targets?: AnnotationTarget[];
  anchor?: { x: number; y: number };
  viewport: { width: number; height: number };
  note: string;
}
export type AnnotationTarget = Omit<Annotation, 'id' | 'note' | 'targets'>;
export { exportNotes } from './output.js';

export function selectorFor(element: Element): string {
  return locatorFor(element).selector;
}

export function pageKey(location: Location, useHashLocation = true): string {
  return routeKey(location, useHashLocation);
}

export function contextFor(element: Element, useHashLocation = true): Omit<Annotation, 'id' | 'note'> {
  const view = element.ownerDocument.defaultView!;
  const sensitive = closestAcross(element, 'input, textarea, select, [contenteditable], [data-noktiq-private]');
  const boundaries = boundariesFor(element, selectorFor);
  const rect = element.getBoundingClientRect();
  const details = detailsFor(element, !!sensitive);
  return {
    page: pageKey(window.location, useHashLocation), ...locatorFor(element), tag: element.localName,
    ...(boundaries.length ? { boundaries } : {}),
    bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    text: textFor(element), ...details,
    viewport: { width: view.innerWidth, height: view.innerHeight },
  };
}

function textFor(element: Element): string {
  if (closestAcross(element, 'input, textarea, select, [contenteditable], [data-noktiq-private]')) return '';
  const view = element.ownerDocument.defaultView!;
  const visibility = view.getComputedStyle(element).visibility;
  let text = '';
  const walk = (root: Node) => {
    for (const node of root.childNodes) {
      if (text.trimStart().length >= 240) return;
      if (node.nodeType === 3) { text = (text + node.textContent).replace(/\s+/g, ' '); continue; }
      if (node.nodeType !== 1) continue;
      const child = node as Element;
      if (child.localName === 'br') { text = (text + ' ').replace(/\s+/g, ' '); continue; }
      if (child.matches('input,textarea,select,datalist,script,style,template,noscript,[contenteditable],[data-noktiq-private],[hidden]')) continue;
      if (child.namespaceURI === 'http://www.w3.org/2000/svg' && ['defs', 'desc', 'metadata', 'title'].includes(child.localName)) continue;
      const style = view.getComputedStyle(child);
      if (style.display === 'none' || style.contentVisibility === 'hidden' || style.opacity === '0' || (style.visibility !== 'visible' && style.visibility !== visibility)) continue;
      const block = child.namespaceURI === 'http://www.w3.org/1999/xhtml' && !/^(inline|contents|ruby)/.test(style.display);
      if (block) text = (text + ' ').replace(/\s+/g, ' ');
      walk(child);
      if (block) text = (text + ' ').replace(/\s+/g, ' ');
    }
  };
  walk(element);
  return text.trim().slice(0, 240);
}

export function readNotes(storage: Pick<Storage, 'getItem'>, key: string, page: string): Annotation[] {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > 1_000_000) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((n): n is Annotation => !!n && typeof n === 'object' &&
      typeof n.id === 'string' && n.page === page && typeof n.selector === 'string' && n.selector.length < 10000 &&
      typeof n.tag === 'string' && typeof n.text === 'string' && n.text.length <= 240 &&
      typeof n.note === 'string' && n.note.length <= 2000 &&
      (n.source === undefined || (typeof n.source === 'string' && n.source.length <= 500)) &&
      validDetails(n) &&
      (n.anchor === undefined || (Number.isFinite(n.anchor?.x) && n.anchor.x >= 0 && n.anchor.x <= 1 && Number.isFinite(n.anchor?.y) && n.anchor.y >= 0 && n.anchor.y <= 1)) &&
      Number.isFinite(n.viewport?.width) && Number.isFinite(n.viewport?.height)).slice(0, 100);
  } catch { return []; }
}

export function writeNotes(storage: Storage, key: string, notes: Annotation[]): void {
  const raw = JSON.stringify(notes);
  // Keep writes within the reader's bound; retain the last durable copy on failure.
  if (raw.length > 1_000_000) throw new RangeError('Noktiq note storage limit exceeded');
  storage.setItem(key, raw);
}

function validDetails(n: Annotation): boolean {
  const string = (value: unknown, limit: number) => typeof value === 'string' && value.length <= limit;
  return (n.editor === undefined || validEditor(n.editor)) && (n.source === undefined || string(n.source, 500)) &&
    (n.anchor === undefined || (!!n.anchor && Number.isFinite(n.anchor.x) && n.anchor.x >= 0 && n.anchor.x <= 1 && Number.isFinite(n.anchor.y) && n.anchor.y >= 0 && n.anchor.y <= 1)) &&
    (n.selectorStrategy === undefined || ['identity', 'structure'].includes(n.selectorStrategy)) &&
    (n.kind === undefined || ['element', 'text', 'group', 'area'].includes(n.kind)) &&
    (n.selectedText === undefined || string(n.selectedText, 1000)) &&
    (n.textRange === undefined || (!!n.textRange && Number.isInteger(n.textRange.start) && Number.isInteger(n.textRange.end) && n.textRange.start >= 0 && n.textRange.end >= n.textRange.start && (n.textRange.text === undefined || string(n.textRange.text, 1000)))) &&
    (n.bounds === undefined || (!!n.bounds && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(n.bounds![key as keyof typeof n.bounds])) && n.bounds.width >= 0 && n.bounds.height >= 0)) &&
    (n.targets === undefined || (Array.isArray(n.targets) && n.targets.length > 0 && n.targets.length <= 50 && n.targets.every(target =>
      !!target && string(target.page, 2000) && string(target.selector, 10000) && string(target.tag, 100) && string(target.text, 240) &&
      !!target.viewport && Number.isFinite(target.viewport.width) && Number.isFinite(target.viewport.height) && !('targets' in target) && validDetails(target as Annotation)))) &&
    (n.computedStyles === undefined || (!!n.computedStyles && typeof n.computedStyles === 'object' && !Array.isArray(n.computedStyles) && Object.entries(n.computedStyles).every(([key, value]) => styleProperties.some(property => property === key) && string(value, 200)))) &&
    (n.boundaries === undefined || (Array.isArray(n.boundaries) && n.boundaries.length <= 16 && n.boundaries.every(b => !!b && ['shadow', 'frame'].includes(b.kind) && string(b.selector, 10000) && (b.page === undefined || string(b.page, 2000))))) &&
    (n.sourceScope === undefined || string(n.sourceScope, 100)) &&
    (n.sourceKind === undefined || ['element','ancestor','component-usage','component'].includes(n.sourceKind)) &&
    (n.sourceProvider === undefined || n.sourceProvider === 'vue-vnode') &&
    (n.componentFile === undefined || (!!n.componentFile && string(n.componentFile.file, 1500) && (n.componentFile.name === undefined || string(n.componentFile.name, 100)))) &&
    (n.role === undefined || string(n.role, 240)) && (n.label === undefined || string(n.label, 240)) &&
    (n.ancestors === undefined || (Array.isArray(n.ancestors) && n.ancestors.length <= 5 && n.ancestors.every(ancestor => !!ancestor && string(ancestor.tag, 100) && !!ancestor.identifiers && typeof ancestor.identifiers === 'object' && !Array.isArray(ancestor.identifiers) && Object.entries(ancestor.identifiers).every(([key, value]) => (key === 'id' || identifyingAttributes.some(name => name === key)) && string(value, 200))))) &&
    (n.classes === undefined || (Array.isArray(n.classes) && n.classes.length <= 12 && n.classes.every(value => string(value, 100)))) &&
    (n.identifiers === undefined || (!!n.identifiers && typeof n.identifiers === 'object' && !Array.isArray(n.identifiers) &&
      Object.entries(n.identifiers).every(([key, value]) => (key === 'id' || identifyingAttributes.some(name => name === key)) && string(value, 200)))) &&
    (n.components === undefined || (!!n.components && ['react', 'vue'].includes(n.components.framework) && Array.isArray(n.components.names) &&
      n.components.names.length > 0 && n.components.names.length <= 20 && n.components.names.every(value => string(value, 100))));
}

export function matchesAnnotation(element: Element, item: Annotation): boolean {
  if (element.localName !== item.tag || closestAcross(element, '[data-noktiq-private]')) return false;
  if (item.textRange && element.textContent?.slice(item.textRange.start, item.textRange.end) !== (item.textRange.text ?? item.selectedText)) return false;
  if (JSON.stringify(boundariesFor(element, selectorFor)) !== JSON.stringify(item.boundaries ?? [])) return false;
  if (item.identifiers && !Object.entries(item.identifiers).every(([name, value]) => element.getAttribute(name) === value)) return false;
  const context = detailsFor(element);
  if (item.ancestors && JSON.stringify(context.ancestors) !== JSON.stringify(item.ancestors)) return false;
  if (item.sourceKind && context.sourceKind !== item.sourceKind) return false;
  if (item.sourceProvider && context.sourceProvider !== item.sourceProvider) return false;
  if (item.componentFile && JSON.stringify(context.componentFile) !== JSON.stringify(item.componentFile)) return false;
  return textFor(element) === item.text && context.source === item.source && context.sourceScope === item.sourceScope &&
    (!item.components || (context.components?.framework === item.components.framework && JSON.stringify(context.components.names) === JSON.stringify(item.components.names)));
}

/** Reattach only when captured evidence identifies one element; never choose the first match. */
export function findAnnotatedElement(document: Document, item: Annotation): Element | undefined {
  return locateAnnotation(document, item).element;
}

export interface LocationResult {
  status: 'found' | 'ambiguous' | 'changed' | 'missing' | 'boundary-unavailable' | 'invalid' | 'too-many';
  element?: Element;
  count?: number;
}
export function locateAnnotation(document: Document, item: Annotation): LocationResult {
  try {
    const root = rootFor(document, item.boundaries);
    if (!root) return { status: 'boundary-unavailable' };
    const primary = root.querySelectorAll(item.selector);
    if (item.selectorStrategy === 'identity' && primary.length === 1 && matchesAnnotation(primary[0], item)) return { status: 'found', element: primary[0], count: 1 };
    const identifier = item.identifiers && Object.entries(item.identifiers)[0];
    const selector = identifier ? attributeSelector(...identifier) : item.sourceProvider === 'vue-vnode' ? CSS.escape(item.sourceScope ?? item.tag) : item.source ? attributeSelector(item.sourceKind === 'component-usage' ? 'data-noktiq-usage' : 'data-noktiq-source', item.source) : CSS.escape(item.tag);
    const scopes = root.querySelectorAll(selector);
    const candidates = new Set<Element>();
    for (const scope of scopes) {
      if (item.sourceScope && !identifier) {
        for (const child of scope.querySelectorAll(CSS.escape(item.tag))) candidates.add(child);
      } else candidates.add(scope);
      if (candidates.size > 500) return { status: 'too-many' };
    }
    const matches = [...candidates].filter(element => matchesAnnotation(element, item));
    if (matches.length === 1) return { status: 'found', element: matches[0], count: 1 };
    if (matches.length > 1) return { status: 'ambiguous', count: matches.length };
    return { status: primary.length ? 'changed' : 'missing' };
  } catch { return { status: 'invalid' }; }
}
