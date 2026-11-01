export const identifyingAttributes = ['data-testid', 'data-test', 'data-test-id', 'data-qa', 'data-cy', 'data-component', 'data-row-id', 'data-row-key', 'data-item-id', 'data-item-key', 'row-id', 'col-id'] as const;
export const styleProperties = ['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'display', 'position', 'width', 'height', 'gap', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'border-radius'] as const;

import { parseSource, validEditor, type EditorTarget } from './editor.js';
export interface ElementDetails {
  editor?: EditorTarget;
  identifiers?: Record<string, string>;
  ancestors?: Array<{ tag: string; identifiers: Record<string, string> }>;
  classes?: string[];
  role?: string;
  label?: string;
  components?: { framework: 'react' | 'vue'; names: string[] };
  source?: string;
  sourceScope?: string;
  sourceKind?: 'element' | 'ancestor' | 'component-usage' | 'component';
  sourceProvider?: 'vue-vnode';
  componentFile?: { file: string; name?: string };
  computedStyles?: Record<string, string>;
}

export function stableId(id: string): boolean {
  return !!id && id.length <= 200 && !/[\u0000-\u001f\u007f]/.test(id) &&
    !/^(?::.*:|_+[rR].*_|(?:radix|headlessui|reka|react-aria)[-:])/i.test(id);
}

export function identifiersFor(element: Element): Record<string, string> {
  const result: Record<string, string> = {};
  if (stableId(element.id)) result.id = element.id;
  for (const name of identifyingAttributes) {
    const value = element.getAttribute(name);
    if (value && value.length <= 200 && !/[\u0000-\u001f\u007f]/.test(value)) result[name] = value;
  }
  return result;
}

export function attributeSelector(name: string, value: string): string {
  return name === 'id' ? `#${CSS.escape(value)}` : `[${name}="${CSS.escape(value)}"]`;
}

/** A selector must resolve to this exact element, including with duplicate IDs. */
export function locatorFor(element: Element): { selector: string; selectorStrategy: 'identity' | 'structure' } {
  const document = element.getRootNode() as Document | ShadowRoot;
  const unique = (selector: string) => {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  };
  const parts: string[] = [];
  let fallback = '';
  for (let current: Element | null = element; current; current = current.parentElement) {
    const identifiers = identifiersFor(current);
    const anchors = [...identifyingAttributes, 'id'].filter(name => identifiers[name]).map(name => attributeSelector(name, identifiers[name]));
    if (anchors.length > 1) anchors.push(anchors.slice(0, 2).join(''));
    for (const anchor of anchors) {
      const candidate = [anchor, ...parts].join(' > ');
      if (unique(candidate)) return { selector: candidate, selectorStrategy: parts.some(part => part.includes(':nth-of-type(')) ? 'structure' : 'identity' };
    }
    const parent = current.parentNode as (Document | ShadowRoot | Element) | null;
    const siblings = parent ? [...parent.children].filter(sibling => sibling.localName === current!.localName) : [current];
    const structural = `${CSS.escape(current.localName)}${siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : ''}`;
    const siblingUnique = anchors.find(anchor => !parent || [...parent.children].filter(sibling => sibling.matches(anchor)).length === 1);
    parts.unshift(siblingUnique ?? structural);
    if (!fallback && unique(parts.join(' > '))) fallback = parts.join(' > ');
  }
  return { selector: fallback || parts.join(' > '), selectorStrategy: 'structure' };
}

type ComponentType = { name?: unknown; displayName?: unknown; __name?: unknown; type?: unknown; render?: unknown };
type Fiber = { type?: unknown; elementType?: unknown; return?: Fiber | null };
type VueInstance = { type?: unknown; parent?: VueInstance | null };

function componentName(value: unknown): string | undefined {
  for (let depth = 0; depth < 4 && value && (typeof value === 'object' || typeof value === 'function'); depth++) {
    const type = value as ComponentType;
    const name = type.displayName || type.name || type.__name;
    if (typeof name === 'string' && name.length <= 100 && !/[\u0000-\u001f]/.test(name)) return name;
    value = type.render || type.type;
  }
}

function componentContext(element: Element): Pick<ElementDetails, 'components' | 'componentFile'> {
  // shortcut: development internals are best effort; use public adapters if framework shapes change.
  try {
    for (let current: Element | null = element; current; current = current.parentElement) {
      const vue = Object.getOwnPropertyDescriptor(current, '__vueParentComponent')?.value as VueInstance | undefined;
      const fiberKey = Object.getOwnPropertyNames(current).find(key => key.startsWith('__reactFiber$'));
      const fiber = fiberKey ? Object.getOwnPropertyDescriptor(current, fiberKey)?.value as Fiber | undefined : undefined;
      if (!vue && !fiber) continue;
      const names: string[] = [];
      let componentFile: ElementDetails['componentFile'];
      const seen = new Set<object>();
      let instance: VueInstance | Fiber | null | undefined = vue ?? fiber;
      while (instance && typeof instance === 'object' && !seen.has(instance) && seen.size < 64) {
        seen.add(instance);
        const name = componentName(instance.type) ?? (!vue ? componentName((instance as Fiber).elementType) : undefined);
        if (name) names.unshift(name);
        for (const candidate of [instance.type, ...(vue ? [] : [(instance as Fiber).elementType])]) {
          let type: any = candidate;
          for (let depth = 0; type && depth < 4; depth++, type = type.render || type.type) {
            const tagged = type[Symbol.for('noktiq.component.source')];
            const file = tagged?.file ?? (vue ? type.__file : undefined);
            if (!componentFile && typeof file === 'string' && file.trim().length > 0 && file.length <= 1500 && !/[\u0000-\u001f]/.test(file)) componentFile = { file: file.replaceAll('\\', '/'), ...(name ? { name } : {}) };
          }
        }
        instance = vue ? (instance as VueInstance).parent : (instance as Fiber).return;
      }
      return { ...(names.length ? { components: { framework: vue ? 'vue' : 'react', names: names.slice(-20) } } : {}), ...(componentFile ? { componentFile } : {}) };
    }
  } catch { /* Missing or inaccessible framework metadata must not break annotation. */ }
  return {};
}

function vnodeSource(element: Element): Record<string, string> | undefined {
  try {
    const vnode = Object.getOwnPropertyDescriptor(element, '__vnode')?.value;
    if (typeof vnode?.type !== 'string' || vnode.type.toLowerCase() !== element.localName.toLowerCase()) return;
    const key = Symbol.for('noktiq.element.source');
    let value = Object.getOwnPropertyDescriptor(vnode, key)?.value;
    if (!value) {
      const owner = Object.getOwnPropertyDescriptor(element, '__vueParentComponent')?.value;
      const root = owner?.[Symbol.for('noktiq.render.root')];
      // Vue clones fallthrough roots: use the actual returned root, never a candidate.
      if (root && owner.subTree === vnode && owner.render === root.render && root.type === vnode.type && root.key === vnode.key) value = root.meta;
    }
    if (value && typeof value === 'object' && typeof value['data-noktiq-source'] === 'string') return value;
  } catch { /* VNode metadata is development-only and may not be exposed by the renderer. */ }
}
export function detailsFor(element: Element, sensitive = false): ElementDetails {
  let sourceElement: Element | undefined, source: string | undefined, usageElement: Element | undefined, renderMetadata: Record<string, string> | undefined;
  for (let current: Element | null = element, depth = 0; current && depth < 64; current = current.parentElement, depth++) {
    const vnode = vnodeSource(current);
    const value = vnode?.['data-noktiq-source'] ?? current.getAttribute('data-noktiq-source');
    if (value && value.length <= 500 && parseSource(value)) { sourceElement = current; source = value; renderMetadata = vnode; break; }
    const usage = current.getAttribute('data-noktiq-usage');
    if (!usageElement && usage && usage.length <= 500 && parseSource(usage)) usageElement = current;
    if (current === element && usageElement) break;
  }
  const identifiers = identifiersFor(element);
  const classes = [...element.classList].filter(value => value.length <= 100).slice(0, 12);
  const result: ElementDetails = {};
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (style) result.computedStyles = Object.fromEntries(styleProperties.map(property => [property, style.getPropertyValue(property).slice(0, 200)]));
  if (Object.keys(identifiers).length) result.identifiers = identifiers;
  const ancestors: NonNullable<ElementDetails['ancestors']> = [];
  for (let parent = element.parentElement, depth = 0; parent && depth < 64 && ancestors.length < 5; parent = parent.parentElement, depth++) {
    const identifiers = identifiersFor(parent);
    if (Object.keys(identifiers).length) ancestors.push({ tag: parent.localName, identifiers });
  }
  if (ancestors.length) result.ancestors = ancestors;
  if (classes.length) result.classes = classes;
  if (!sensitive) {
    for (const name of ['role', 'aria-label'] as const) {
      const value = element.getAttribute(name);
      if (value && value.length <= 240) result[name === 'role' ? 'role' : 'label'] = value;
    }
  }
  Object.assign(result, componentContext(element));
  if (!source && usageElement) { source = usageElement.getAttribute('data-noktiq-usage')!; sourceElement = usageElement; result.sourceKind = 'component-usage'; }
  if (source && source.length <= 500 && !/[\u0000-\u001f]/.test(source) && /:\d+:\d+$/.test(source)) {
    result.source = source;
    if (renderMetadata) result.sourceProvider = 'vue-vnode';
    result.sourceKind ??= sourceElement === element ? 'element' : 'ancestor';
    try { const editor: unknown = JSON.parse(renderMetadata?.['data-noktiq-editor'] ?? sourceElement!.getAttribute(result.sourceKind === 'component-usage' ? 'data-noktiq-usage-editor' : 'data-noktiq-editor') ?? 'null'); if (validEditor(editor)) result.editor = editor; } catch { /* Source selection still works without editor metadata. */ }
    if (sourceElement !== element) result.sourceScope = sourceElement!.localName;
  }
  if (!result.source && result.componentFile) result.sourceKind = 'component';
  const parsed = parseSource(result.source);
  if (result.componentFile && result.editor && parsed && result.editor.file.endsWith('/' + parsed.file)) {
    const root = result.editor.file.slice(0, -parsed.file.length);
    if (result.componentFile.file.startsWith(root)) result.componentFile.file = result.componentFile.file.slice(root.length);
  }
  return result;
}
