import { contextFor, exportNotes, locateAnnotation, matchesAnnotation, pageKey, type Annotation, type LocationResult } from './context.js';
import { loadNotes, changeNotes, type NoteChange } from './storage.js';
import { styles } from './styles.js';
import { icon, nok } from './mascot.js';
import { closestAcross, parentAcross, hostPoint, hostRect, isElement, watchContexts, type QueryRoot } from './dom.js';
import type { NoktiqOptions } from './options.js';
import { elementsInArea, selectedText, textRangeFor } from './selection.js';
import { pageMotion } from './motion.js';
import type { CopyFormat, OutputDetail } from './output.js';
import { parseSource, editorURL } from './editor.js';
export type { SourceLocation } from './editor.js';
export { exportNotes, type Annotation } from './context.js';
export type { NoktiqOptions } from './options.js';
export type { CopyFormat, OutputDetail, OutputOptions } from './output.js';
export type { AnnotationTarget } from './context.js';

let active: { users: number; destroy: () => void } | undefined;
type SelectionMode = 'element' | 'text' | 'multi' | 'area';

/** Mount after the page is ready, only in development. Returns an idempotent cleanup. */
export function mountNoktiq(options: NoktiqOptions = {}): () => void {
  if (typeof document === 'undefined') return () => {};
  if (!active) active = { users: 0, destroy: createToolbar(options) };
  const instance = active;
  instance.users++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--instance.users === 0) { instance.destroy(); active = undefined; }
  };
}

function createToolbar(options: NoktiqOptions): () => void {
  const host = document.createElement('noktiq-toolbar');
  host.lang = 'en';
  host.style.cssText = 'position:fixed;width:0;height:0;bottom:0;right:0;z-index:2147483647;pointer-events:none;margin:0;border:0;padding:0;overflow:visible;background:transparent;';
  if (typeof host.showPopover === 'function') host.setAttribute('popover', 'manual');
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  shadow.append(style);
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  };
  const button = (text: string, action: () => void, className = '') => {
    const node = el('button', className, text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  function iconButton(label: string, name: Parameters<typeof icon>[0], action: () => void) {
    const node = button('', action, 'icon-button');
    node.setAttribute('aria-label', label); node.title = label; node.append(icon(name));
    return node;
  }
  const events = new AbortController();
  host.addEventListener('click', event => event.stopPropagation(), { signal: events.signal });
  let currentPage = pageKey(location, options.useHashLocation);
  const load = () => loadNotes(currentPage);
  let notes: Annotation[] = load();
  let draft: Omit<Annotation, 'id' | 'note'> & { id?: string } | undefined;
  let selecting = false;
  let hovered: Element | undefined;
  let focusBefore: HTMLElement | null = null;
  let draftTarget: Element | undefined;
  let copying = false;
  let saving = false;
  const busyControls = new Map<HTMLButtonElement, boolean>();
  let moodTimer = 0;
  let toastTimer = 0;
  let detail: OutputDetail = options.outputDetail ?? 'standard';
  let format: CopyFormat = options.copyFormat ?? 'markdown';
  let selectionMode: SelectionMode = 'element';
  let panelView: 'notes' | 'editor' | 'output' | 'tools' = 'notes';
  let contextRoots: QueryRoot[] = [document];
  let pinsVisible = true;
  let shortcuts = options.enableKeyboardShortcuts !== false;
  let draftRange: Range | undefined;
  let rebinding: { id: string; index: number; mode: SelectionMode } | undefined;
  const parentHistory: Array<{ draft: NonNullable<typeof draft>; target: Element }> = [];
  const locations = new Map<string, LocationResult>();
  let areaDrag: { x: number; y: number } | undefined;
  const picked = new Set<Element>();
  const motion = pageMotion(host);
  let dockDrag: { x: number; y: number; right: number; bottom: number; moved: boolean } | undefined;
  let suppressToggle = false;
  let suppressTouchClick = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const surfaceAnimations = new Map<HTMLElement, Animation>();
  const references = new Map<string, Element>();
  const referenceRevisions = new Map<string, number>();
  let documentRevision = 0;
  const pinElements = new Map<string, HTMLButtonElement>();
  const pins = el('div');
  const groupHighlights = el('div');
  const areaHighlight = el('div', 'highlight'); areaHighlight.hidden = true;
  const groupActions = el('div', 'selection-actions'); groupActions.hidden = true;
  const highlight = el('div', 'highlight');
  const hint = el('div', 'hint', 'Click an element to annotate · Esc to exit');
  hint.hidden = highlight.hidden = true;
  const dock = el('div', 'dock');
  dock.dataset.mood = 'idle';
  dock.setAttribute('role', 'toolbar');
  dock.setAttribute('aria-label', 'Noktiq');
  const toggle = button('', () => {
    if (suppressToggle) { suppressToggle = false; return; }
    if (menu.hidden) openToolbar(); else closeToolbar();
  }, 'brand');
  toggle.setAttribute('aria-label', 'Open Noktiq');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'noktiq-menu');
  toggle.innerHTML = nok;
  const count = el('span', 'count');
  count.setAttribute('aria-hidden', 'true');
  const sheets = el('span', 'copy-sheets');
  sheets.setAttribute('aria-hidden', 'true');
  sheets.append(el('i'), el('i'), el('i'));
  toggle.append(count, sheets);
  const menu = el('div', 'menu');
  menu.id = 'noktiq-menu';
  menu.hidden = true;
  const selectLabel = el('span', '', 'Select');
  const selectButton = button('', () => selecting ? stopSelecting() : startSelecting());
  selectButton.append(icon('select'), selectLabel);
  selectButton.setAttribute('aria-pressed', 'false');
  const menuCount = el('span', 'menu-count');
  const notesButton = button('', () => {
    if (draft) { textarea.focus(); return; }
    if (!panel.hidden && panelView === 'notes') { setVisible(panel, false); startSelecting(); return; }
    stopSelecting(); renderList(); showPanel();
  });
  notesButton.setAttribute('aria-label', 'Show notes');
  notesButton.append(icon('notes'), el('span', '', 'Notes'), menuCount);
  const copyLabel = el('span', '', 'Copy');
  const copyButton = button('', () => { void copyNotes(); });
  copyButton.append(icon('copy'), copyLabel);
  const toolsButton = button('⋯', () => { if (draft) { textarea.focus(); return; } if (!panel.hidden && panelView === 'tools') { setVisible(panel, false); startSelecting(); } else showTools(); });
  toolsButton.setAttribute('aria-label', 'Tools and settings');
  menu.append(selectButton, notesButton, copyButton, toolsButton);
  dock.append(menu, toggle);
  const panel = el('section', 'panel');
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Noktiq notes');
  const heading = el('div', 'heading');
  const title = el('div');
  const panelTitle = el('strong', '', 'Your change requests');
  const titleCount = el('span', 'title-count'); titleCount.hidden = true;
  title.append(el('div', 'eyebrow', 'POINT. NOTE. PASTE.'), panelTitle, titleCount);
  heading.append(title, iconButton('Close', 'close', () => {
    if (draft) { status.textContent = 'Save your note or choose Cancel first.'; return; }
    setVisible(panel, false);
    if (!menu.hidden) startSelecting();
    notesButton.focus();
  }));
  const status = el('p', 'status');
  status.setAttribute('role', 'status');
  const toast = el('div', 'toast');
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  const body = el('div', 'body');
  panel.append(heading, status, body);
  const textarea = el('textarea');
  textarea.id = 'noktiq-note';
  textarea.maxLength = 2000;
  textarea.placeholder = 'For example: Make this heading smaller and add more space below it.';
  groupActions.append(button('Annotate selection', openGroupEditor, 'primary small'));
  shadow.append(highlight, groupHighlights, areaHighlight, pins, hint, groupActions, panel, toast, dock);
  document.body.append(host);

  function syncPortal() {
    const requested = typeof options.portalContainer === 'function' ? options.portalContainer() : options.portalContainer;
    const roots = contextRoots.filter(root => root === document || root.ownerDocument === document);
    const overlays = roots.flatMap(root => [...root.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')]).filter(element => {
      if (!element.getClientRects().length || getComputedStyle(element).visibility === 'hidden' || element.getAttribute('aria-hidden') === 'true' || element.getAttribute('data-state') === 'closed' || element.hasAttribute('data-closed')) return false;
      if (element.localName === 'dialog') return element.matches(':modal');
      if (['dialog','alertdialog'].includes(element.getAttribute('role')!)) return true;
      for (let parent: Element | null = element; parent && parent !== document.body; parent = parent.parentElement) if (['fixed','absolute'].includes(getComputedStyle(parent).position)) return true;
      return false;
    });
    const native = overlays.filter(element => element.localName === 'dialog' && element.matches(':modal'));
    let activeModal: Element | undefined = native.length === 1 ? native[0] : undefined;
    if (native.length > 1) {
      const clamp = (value: number, limit: number) => Math.max(1, Math.min(Math.max(1, limit - 2), Math.round(value)));
      const points: Array<[QueryRoot, number, number]> = [...roots].reverse().flatMap(root => [[root, 1, 1], [root, clamp(innerWidth / 2, innerWidth), clamp(innerHeight / 2, innerHeight)]] as Array<[QueryRoot, number, number]>);
      for (const dialog of [...native].reverse()) {
        const rect = dialog.getBoundingClientRect(), root = dialog.getRootNode() as QueryRoot;
        if (roots.includes(root)) points.push([root, clamp(rect.left + rect.width / 2, innerWidth), clamp(rect.top + rect.height / 2, innerHeight)]);
      }
      for (const [root, x, y] of points) {
        const hits = (typeof root.elementsFromPoint === 'function' ? root.elementsFromPoint(x, y) : [root.elementFromPoint(x, y)]).filter((node): node is Element => !!node && node !== host && !host.contains(node));
        for (const hit of hits) {
          activeModal = [...native].reverse().find(dialog => dialog === hit || dialog.contains(hit));
          if (activeModal) break;
        }
        if (activeModal) break;
      }
      const focused = document.activeElement;
      if (!activeModal && (!focused || (focused !== host && !host.contains(focused)))) activeModal = [...native].reverse().find(element => element.matches(':focus-within'));
    }
    const modal = overlays.filter(element => !activeModal || element === activeModal || closestAcross(element, 'dialog:modal') === activeModal).pop();
    // Some overlays put their focus boundary inside the element carrying role=dialog.
    const content = modal && (modal.localName === 'dialog' || ['dialog','alertdialog'].includes(modal.getAttribute('role')!)) ? modal.querySelector(':scope > div[tabindex="-1"]:not([role]), :scope > section[tabindex="-1"]:not([role])') : undefined;
    const parent = requested?.isConnected && requested.ownerDocument === document ? requested : content ?? modal ?? document.body;
    if (host.parentNode !== parent) {
      if (host.hasAttribute('popover') && host.matches(':popover-open')) host.hidePopover();
      parent.append(host);
    }
    if (parent !== document.body) {
      // Modal managers may have hidden the toolbar while it was still a body sibling.
      for (const attribute of ['aria-hidden','inert','data-base-ui-inert']) if (host.hasAttribute(attribute)) host.removeAttribute(attribute);
    }
    if (host.hasAttribute('popover') && !host.matches(':popover-open') && host.isConnected) {
      try { host.showPopover(); } catch { /* Ordinary fixed positioning remains available on older engines. */ }
    }
  }
  syncPortal();

  function changeMode(mode: typeof selectionMode) {
    if (draft || copying || saving) return;
    selectionMode = mode; picked.clear(); updateGroupHighlights(); startSelecting();
  }

  function showTools() {
    stopSelecting(); panelView = 'tools'; body.replaceChildren();
    const choose = (labelText: string, value: string, values: [string, string][], changed: (value: string) => void) => {
      const label = el('label', 'tool-setting', labelText);
      const select = el('select'); select.setAttribute('aria-label', labelText);
      for (const [key, text] of values) { const option = el('option', '', text); option.value = key; select.append(option); }
      select.value = value; select.addEventListener('change', () => changed(select.value)); label.append(select); body.append(label);
    };
    choose('Selection mode', selectionMode, [['element','Element'],['text','Text'],['multi','Multiple elements'],['area','Area']], value => changeMode(value as typeof selectionMode));
    choose('Output detail', detail, [['compact','Compact'],['standard','Standard'],['detailed','Detailed']], value => { detail = value as OutputDetail; });
    choose('Copy format', format, [['markdown','Notes (Markdown)'],['source','File paths only'],['classes','CSS classes only']], value => { format = value as CopyFormat; });
    body.append(button(pinsVisible ? 'Hide pins' : 'Show pins', () => { pinsVisible = !pinsVisible; pins.hidden = !pinsVisible; showTools(); }, 'small'));
    body.append(button(motion.paused ? 'Resume page motion' : 'Pause page motion', () => { motion.toggle(contextRoots); showTools(); }, 'small'));
    const label = el('label', 'tool-setting', 'Keyboard shortcuts'); const checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.checked = shortcuts;
    checkbox.addEventListener('change', () => { shortcuts = checkbox.checked; }); label.append(checkbox); body.append(label);
    body.append(el('p', 'muted', 'Ctrl/Cmd+Shift+F toggle · E element · T text · M multiple · A area · H pins · P motion · C copy · Esc close. Drag Nok to move it, or use Shift+arrow keys while focused.'));
    showPanel(); positionPanel();
  }

  function updateGroupHighlights() {
    groupHighlights.replaceChildren();
    for (const target of picked) {
      if (!target.isConnected) { picked.delete(target); continue; }
      const rect = hostRect(target); const box = el('div', 'highlight');
      Object.assign(box.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` }); groupHighlights.append(box);
    }
    groupActions.hidden = picked.size === 0 || !!draft || !selecting;
  }

  function openGroupEditor() {
    const targets = [...picked].filter(target => target.isConnected && !closestAcross(target, '[data-noktiq-private]')).slice(0, 50);
    if (!targets.length) return;
    const contexts = targets.map(target => contextFor(target, options.useHashLocation));
    openEditor({ ...contexts[0], kind: selectionMode === 'area' ? 'area' : 'group', targets: contexts }, '', targets[0]);
  }

  function captureText(child: Document) {
    if (!selecting || draft || selectionMode !== 'text') return;
    const selected = selectedText(child);
    if (!selected || closestAcross(selected.element, 'noktiq-toolbar')) return;
    const bounds = selected.range.getBoundingClientRect(), rect = selected.element.getBoundingClientRect();
    openEditor({ ...contextFor(selected.element, options.useHashLocation), kind: 'text', selectedText: selected.selectedText, textRange: selected.textRange,
      anchor: { x: Math.max(0, Math.min(1, (bounds.left + bounds.width / 2 - rect.left) / (rect.width || 1))), y: Math.max(0, Math.min(1, (bounds.top + bounds.height / 2 - rect.top) / (rect.height || 1))) } }, '', selected.element);
    draftRange = selected.range;
    showHighlight(selected.element);
  }

  function moveDock(right: number, bottom: number) {
    const rect = dock.getBoundingClientRect();
    dock.style.right = `${Math.max(8, Math.min(innerWidth - rect.width - 8, right))}px`;
    dock.style.bottom = `${Math.max(8, Math.min(innerHeight - rect.height - 8, bottom))}px`;
    positionPanel();
  }
  function layoutDock() {
    let rect = dock.getBoundingClientRect();
    dock.style.right = `${Math.max(8, Math.min(innerWidth - rect.width - 8, innerWidth - rect.right))}px`;
    dock.style.bottom = `${Math.max(8, Math.min(innerHeight - rect.height - 8, innerHeight - rect.bottom))}px`;
    rect = dock.getBoundingClientRect();
    if (!menu.hidden || menu.hasAttribute('data-closing')) {
      const width = menu.offsetWidth, height = menu.offsetHeight;
      const leftSpace = rect.left - 12, rightSpace = innerWidth - rect.right - 12;
      const side = leftSpace >= width || leftSpace >= rightSpace ? 'left' : 'right';
      const vertical = Math.max(leftSpace, rightSpace) < width + 8;
      const x = vertical ? (rect.width - width) / 2 : side === 'left' ? -width - 8 : rect.width + 8;
      const y = vertical ? rect.top >= height + 12 ? -height - 10 : rect.height + 10 : (rect.height - height) / 2;
      menu.style.left = `${Math.max(8 - rect.left, Math.min(innerWidth - rect.left - width - 8, x))}px`;
      menu.style.top = `${Math.max(8 - rect.top, Math.min(innerHeight - rect.top - height - 8, y))}px`;
      menu.style.transformOrigin = vertical ? 'center' : side === 'left' ? 'right center' : 'left center';
      menu.style.setProperty('--surface-x', vertical ? '0px' : side === 'left' ? '8px' : '-8px');
      menu.style.setProperty('--surface-y', vertical ? y < 0 ? '6px' : '-6px' : '0px');
    }
    toast.style.right = `${Math.max(12, Math.min(innerWidth - toast.offsetWidth - 12, innerWidth - rect.right))}px`;
    toast.style.bottom = `${Math.max(12, Math.min(innerHeight - toast.offsetHeight - 12, innerHeight - rect.top + 10))}px`;
  }
  function setVisible(node: HTMLElement, visible: boolean) {
    if (node.hidden === !visible) return;
    const previous = surfaceAnimations.get(node);
    const current = previous ? { opacity: getComputedStyle(node).opacity, transform: getComputedStyle(node).transform } : undefined;
    previous?.cancel(); surfaceAnimations.delete(node);
    node.inert = !visible; node.hidden = !visible;
    if (visible) node.removeAttribute('aria-hidden'); else node.setAttribute('aria-hidden', 'true');
    node.toggleAttribute('data-closing', !visible);
    if (node === menu) layoutDock();
    if (reducedMotion.matches || typeof node.animate !== 'function') { node.removeAttribute('data-closing'); return; }
    const style = getComputedStyle(node);
    const offset = `translate(${style.getPropertyValue('--surface-x') || '0px'},${style.getPropertyValue('--surface-y') || '6px'}) scale(.98)`;
    const animation = node.animate(visible ? [current ?? { opacity: 0, transform: offset }, { opacity: 1, transform: 'none' }] : [current ?? { opacity: 1, transform: 'none' }, { opacity: 0, transform: offset }], { duration: visible ? 210 : 145, easing: 'cubic-bezier(.2,.75,.25,1)' });
    surfaceAnimations.set(node, animation);
    animation.onfinish = () => { if (surfaceAnimations.get(node) === animation) { surfaceAnimations.delete(node); node.removeAttribute('data-closing'); } };
    if (node === menu) for (const [index, child] of [...menu.children].entries()) {
      const control = child as HTMLElement;
      surfaceAnimations.get(control)?.cancel(); surfaceAnimations.delete(control);
      if (!visible) continue;
      const entry = control.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 150, delay: index * 18, fill: 'backwards', easing: 'ease-out' });
      surfaceAnimations.set(control, entry);
      entry.onfinish = () => { if (surfaceAnimations.get(control) === entry) surfaceAnimations.delete(control); };
    }
  }
  toggle.title = 'Noktiq · Drag to move';
  toggle.addEventListener('click', (event: MouseEvent) => {
    // Touch activates on pointerup; discard its later compatibility click, including older MouseEvents.
    if (event.isTrusted && ('pointerType' in event ? event.pointerType === 'touch' : suppressTouchClick && event.detail > 0)) { suppressTouchClick = false; event.stopImmediatePropagation(); }
  }, { capture: true });
  toggle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    suppressToggle = false;
    suppressTouchClick = false;
    const rect = dock.getBoundingClientRect(); dockDrag = { x: event.clientX, y: event.clientY, right: innerWidth - rect.right, bottom: innerHeight - rect.bottom, moved: false };
  });
  toggle.addEventListener('lostpointercapture', event => {
    if (event.target !== toggle || toggle.hasPointerCapture(event.pointerId)) return;
    if (dockDrag) suppressToggle = dockDrag.moved;
    dockDrag = undefined; delete dock.dataset.dragging;
  });

  function openToolbar() {
    setVisible(menu, true);
    toggle.setAttribute('aria-expanded', 'true');
    if (draft) {
      showPanel(); positionPanel(); setMood('writing');
      if (draftTarget?.isConnected) showHighlight(draftTarget);
      textarea.focus();
    } else startSelecting();
    positionPanel();
  }

  function closeToolbar() {
    if (rebinding) { selectionMode = rebinding.mode; rebinding = undefined; draft = undefined; draftTarget = undefined; draftRange = undefined; parentHistory.length = 0; }
    areaDrag = undefined; dockDrag = undefined; delete dock.dataset.dragging;
    stopSelecting();
    setVisible(panel, false); setVisible(menu, false); toast.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    setMood('idle');
    picked.clear(); updateGroupHighlights(); areaHighlight.hidden = true;
    syncControls();
  }

  function finishEditor() {
    if (rebinding) { selectionMode = rebinding.mode; rebinding = undefined; }
    parentHistory.length = 0;
    draft = undefined;
    draftRange = undefined; picked.clear(); updateGroupHighlights();
    setVisible(panel, false);
    draftTarget = undefined; syncControls();
    if (!menu.hidden) startSelecting();
  }

  function setMood(mood: string, duration = 0) {
    clearTimeout(moodTimer);
    dock.dataset.mood = mood;
    if (duration) moodTimer = window.setTimeout(() => {
      dock.dataset.mood = menu.hidden ? 'idle' : draft ? 'writing' : selecting ? 'selecting' : 'idle';
    }, duration);
  }

  function syncControls() {
    panel.dataset.view = panelView;
    panelTitle.textContent = panelView === 'notes' ? 'Notes' : panelView === 'tools' ? 'Tools' : panelView === 'output' ? 'Ready to copy' : 'Your change request';
    titleCount.hidden = panelView !== 'notes'; titleCount.textContent = String(notes.length);
    count.hidden = notes.length === 0;
    count.textContent = String(notes.length);
    menuCount.textContent = String(notes.length);
    copyButton.disabled = notes.length === 0 || !!draft || !!rebinding || copying || saving;
    selectButton.disabled = notesButton.disabled = toolsButton.disabled = copying || saving || !!rebinding;
    textarea.readOnly = saving;
    if (saving) for (const control of body.querySelectorAll<HTMLButtonElement>('button')) {
      if (!busyControls.has(control)) busyControls.set(control, control.disabled);
      control.disabled = true;
    }
    else { for (const [control, disabled] of busyControls) control.disabled = disabled; busyControls.clear(); }
    copyLabel.textContent = copying ? 'Copying' : 'Copy';
  }

  function showPanel() {
    toast.hidden = true;
    clearTimeout(toastTimer);
    syncControls(); setVisible(panel, true);
  }

  function positionPanel() {
    layoutDock();
    for (const property of ['left', 'top', 'right', 'bottom']) panel.style.removeProperty(property);
    if (panel.hidden) return;
    if (!draftTarget?.isConnected || !draft) {
      const rect = dock.getBoundingClientRect(), width = panel.offsetWidth, height = panel.offsetHeight;
      const top = rect.top - height - 12 >= 12 ? rect.top - height - 12 : rect.bottom + 12;
      panel.style.left = `${Math.max(12, Math.min(innerWidth - width - 12, rect.right - width))}px`;
      panel.style.top = `${Math.max(12, Math.min(innerHeight - height - 12, top))}px`;
      panel.style.right = panel.style.bottom = 'auto';
      return;
    }
    const rect = hostRect(draftTarget);
    const { width, height } = panel.getBoundingClientRect();
    const maxLeft = Math.max(12, innerWidth - width - 12);
    const maxTop = Math.max(16, innerHeight - height - 108);
    const right = rect.right + 16;
    const left = rect.left - width - 16;
    const beside = right <= maxLeft || left >= 12;
    const x = right <= maxLeft ? right : left >= 12 ? left : Math.min(rect.left, maxLeft);
    const y = beside ? rect.top : rect.bottom + 14 <= maxTop ? rect.bottom + 14 : rect.top - height - 14;
    panel.style.left = `${Math.max(12, Math.min(maxLeft, x))}px`;
    panel.style.top = `${Math.max(16, Math.min(maxTop, y))}px`;
    panel.style.right = panel.style.bottom = 'auto';
  }

  function storageWarning(stored: boolean) {
    if (!stored) {
      const message = 'Browser storage is unavailable. Notes are kept for this session; copy them before leaving.';
      if (panel.hidden) { clearTimeout(toastTimer); toast.textContent = message; toast.hidden = false; layoutDock(); }
      else status.textContent = message;
    }
  }
  async function persist(change: NoteChange, page = currentPage) {
    saving = true; syncControls();
    try {
      const result = await changeNotes(page, change, notes);
      if (currentPage === page) notes = result.notes;
      return result;
    } finally { saving = false; syncControls(); }
  }

  function startSelecting() {
    if (copying || saving) return;
    refreshRoute();
    if (draft) { status.textContent = 'Save your current note or choose Cancel first.'; textarea.focus(); return; }
    if (notes.length >= 100 && !rebinding) {
      stopSelecting();
      toast.textContent = 'You have reached the limit of 100 notes for this page.';
      toast.hidden = false;
      layoutDock();
      return;
    }
    focusBefore = (shadow.activeElement ?? document.activeElement) as HTMLElement | null;
    selecting = true;
    setVisible(panel, false);
    toast.hidden = true;
    hint.textContent = selectionMode === 'text' ? 'Drag to select text · Esc to exit' : selectionMode === 'multi' ? 'Select elements, then choose Annotate selection · Esc to exit' : selectionMode === 'area' ? 'Drag to select an area · Esc to exit' : 'Click an element to annotate · Shift+click to select multiple · Esc to exit';
    if (rebinding) hint.textContent = 'Select a new target · Esc to cancel · Your original note is kept until you save';
    hint.hidden = false;
    selectLabel.textContent = 'Selecting';
    selectButton.setAttribute('aria-pressed', 'true');
    setMood('selecting');
    updateGroupHighlights();
    syncControls();
  }

  function stopSelecting() {
    selecting = false;
    hovered = undefined;
    hint.hidden = highlight.hidden = true;
    selectLabel.textContent = 'Select';
    selectButton.setAttribute('aria-pressed', 'false');
    setMood(draft ? 'writing' : 'idle');
    groupActions.hidden = true;
  }

  function replaceTarget(value: NonNullable<typeof draft>, context: Omit<Annotation, 'id' | 'note'>, index = 0): NonNullable<typeof draft> {
    if (!value.targets) return { ...context, ...(value.id ? { id: value.id } : {}) };
    const targets = value.targets.map((target, i) => i === index ? context : target);
    return index === 0 ? { ...context, id: value.id, kind: value.kind, targets } : { ...value, targets };
  }
  function beginRebind(item: Annotation, index = 0) {
    if (copying || saving || draft) return;
    rebinding = { id: item.id, index, mode: selectionMode }; selectionMode = 'element';
    picked.clear(); updateGroupHighlights(); startSelecting();
  }
  function selectableParent(target?: Element) {
    const parent = target && parentAcross(target);
    return parent && !['html', 'body'].includes(parent.localName) && !closestAcross(parent, '[data-noktiq-private],noktiq-toolbar') ? parent : undefined;
  }
  function changeParent(back = false) {
    if (!draft || !draftTarget || copying || saving) return;
    if (draft.page !== pageKey(location, options.useHashLocation)) { status.textContent = 'The page changed. Save your current note or choose Cancel first.'; return; }
    const note = textarea.value;
    if (back) { const previous = parentHistory.pop(); if (previous) openEditor(previous.draft, note, previous.target, true); return; }
    const parent = selectableParent(draftTarget);
    if (!parent) return;
    const index = draft.targets?.findIndex(target => matchesAnnotation(draftTarget!, { ...target, id: '', note: '' })) ?? 0;
    if (index < 0) { status.textContent = 'The selected target changed. Rebind it from Notes.'; return; }
    parentHistory.push({ draft, target: draftTarget });
    openEditor(replaceTarget(draft, contextFor(parent, options.useHashLocation), Math.max(0, index)), note, parent, true);
  }
  function openEditor(value: typeof draft, note = '', element?: Element, keepHistory = false) {
    if (copying || saving) return;
    if (!keepHistory) parentHistory.length = 0;
    draft = value;
    panelView = 'editor'; draftRange = undefined;
    draftTarget = element ?? (value?.id ? resolve(value as Annotation) : undefined);
    if (draftTarget && value?.textRange && value.selectedText) draftRange = textRangeFor(draftTarget, value.textRange, value.selectedText);
    stopSelecting();
    showPanel();
    status.textContent = '';
    const label = el('label', '', 'What should change?');
    label.htmlFor = textarea.id;
    textarea.value = note;
    const shown = draft?.targets?.find(target => draftTarget && matchesAnnotation(draftTarget, { ...target, id: '', note: '' })) ?? draft;
    const target = el('code', '', `${draft?.targets ? `${draft.targets.length} selected · ` : ''}${shown?.selector ?? ''}`);
    const source = sourceControl(shown);
    const actions = el('div', 'actions');
    const save = button('Save note', async () => {
      if (saving) return;
      const note = textarea.value.trim();
      if (!draft || !note) { textarea.focus(); return; }
      const item = { ...draft, id: draft.id ?? crypto.randomUUID(), note };
      const selectedTarget = draftTarget;
      const result = await persist({ type: 'save', note: item, existing: !!draft.id }, draft.page);
      if (!host.isConnected) return;
      if (result.conflict) { references.clear(); referenceRevisions.clear(); locations.clear(); updatePins(); status.textContent = result.conflict === 'deleted' ? 'This note was deleted in another tab. Copy your text before canceling, then create a new note.' : 'This page already has 100 notes. Copy your text before canceling.'; save.disabled = false; return; }
      references.clear(); referenceRevisions.clear(); locations.clear();
      if (!item.targets && selectedTarget?.isConnected) references.set(item.id, selectedTarget);
      finishEditor();
      updatePins();
      setMood('saved', 650);
      selectButton.focus();
      storageWarning(result.stored);
    }, 'primary');
    save.disabled = !note.trim();
    textarea.oninput = () => { save.disabled = !textarea.value.trim(); };
    actions.append(button('Cancel', () => { finishEditor(); focusBefore?.focus(); }), save);
    const stylesPanel = el('details', 'style-details'); stylesPanel.append(el('summary', '', 'Computed styles'));
    for (const [name, value] of Object.entries(shown?.computedStyles ?? {})) stylesPanel.append(el('div', 'style-value', `${name}: ${value}`));
    const hierarchy = el('div', 'row-actions');
    const up = button('Select parent', () => changeParent(), 'small'); up.disabled = !selectableParent(draftTarget);
    const down = button('Previous element', () => changeParent(true), 'small'); down.disabled = parentHistory.length === 0;
    hierarchy.append(up, down);
    body.replaceChildren(source, target, hierarchy, label, textarea, actions, stylesPanel);
    syncControls();
    positionPanel();
    if (draftTarget?.isConnected) { highlight.dataset.locked = 'true'; showHighlight(draftTarget); }
    textarea.focus();
  }

  function renderList() {
    panelView = 'notes';
    body.replaceChildren();
    status.textContent = '';
    draftTarget = undefined;
    highlight.hidden = true;
    delete highlight.dataset.locked;
    syncControls();
    positionPanel();
    setMood('idle');
    if (!notes.length) {
      const empty = el('div', 'empty');
      empty.append(el('span', '', '↗'), el('strong', '', 'Start by selecting an element.'), el('p', '', 'Describe the change right where it belongs.'));
      body.append(empty);
    }
    notes.forEach((item, index) => {
      const row = el('article', 'row');
      const rowHead = el('div', 'row-head');
      rowHead.append(el('span', 'number', String(index + 1)), el('strong', 'target', `${item.tag} · ${item.text || item.selector}`));
      const actions = el('div', 'note-actions');
      actions.append(iconButton('Edit', 'edit', () => openEditor(item, item.note)), iconButton('Copy', 'copy', () => { void copyNotes([item]); }), iconButton('Delete', 'trash', async () => {
        if (saving || copying) return;
        const result = await persist({ type: 'delete', id: item.id });
        if (!host.isConnected) return;
        references.delete(item.id); referenceRevisions.delete(item.id); renderList(); updatePins(); storageWarning(result.stored);
      }));
      rowHead.append(actions);
      row.append(rowHead, el('p', 'note', item.note));
      const details = el('details', 'note-details'); details.append(el('summary', '', 'Details'));
      (item.targets ?? [item]).forEach((target, targetIndex) => {
        const position = el('div', 'target-position');
        const state = el('div', 'location-state'); state.dataset.noteId = item.id; state.dataset.targetIndex = String(targetIndex); state.setAttribute('role', 'status');
        position.append(sourceControl(target, true), state);
        row.append(position);
        const targetDetails = el('div', 'target-details');
        targetDetails.append(el('code', '', target.selector), button(item.targets ? `Rebind target ${targetIndex + 1}` : 'Rebind target', () => beginRebind(item, targetIndex), 'quiet small'));
        details.append(targetDetails);
      });
      row.append(details);
      body.append(row);
    });
    if (notes.length) {
      const actions = el('div', 'notes-footer');
      actions.append(button('Copy all notes', () => { void copyNotes(); }, 'primary'), button('Clear all', async () => {
        if (copying || saving || draft) return;
        const result = await persist({ type: 'clear' });
        if (!host.isConnected) return;
        references.clear(); referenceRevisions.clear(); renderList(); updatePins(); storageWarning(result.stored);
      }, 'quiet'));
      body.append(actions);
    }
    body.append(el('p', 'muted list-caption', 'Stored in this browser · Ready for your coding agent.'));
    updateLocationLabels();
  }

  function sourceControl(target?: Omit<Annotation, 'id' | 'note'>, compact = false) {
    const wrapper = el('div', 'source-context');
    if (compact) wrapper.classList.add('compact-source');
    const kind = target?.sourceKind === 'component-usage' ? 'Component usage · Not the inner element definition' : target?.source ? target.sourceScope ? 'Parent element source' : 'Selected element source' : target?.componentFile ? 'Component file found · Exact line unknown' : 'Source unavailable · DOM context will be used';
    if (!compact || target?.sourceKind !== 'element') wrapper.append(el('div', 'source-kind', kind));
    if (!target?.source || !parseSource(target.source) || (!target.editor && !options.openInEditor)) {
      wrapper.append(el('div', 'source', target?.source ?? target?.componentFile?.file ?? 'No source file · DOM location will be saved'));
      return wrapper;
    }
    const node = button(target.source, () => { void openSource(target, node); }, 'source source-link');
    node.setAttribute('aria-label', `Open source file: ${target.source}`);
    node.title = target.sourceScope ? `Parent source: ${target.sourceScope}` : 'Open source file in editor';
    wrapper.append(node);
    if (target.componentFile && target.sourceKind !== 'element') wrapper.append(el('div', 'source', `Component: ${target.componentFile.file}`));
    return wrapper;
  }
  async function openSource(target: Omit<Annotation, 'id' | 'note'>, node: HTMLButtonElement) {
    const parsed = parseSource(target.source);
    if (!parsed || !target.source || node.disabled) return;
    node.disabled = true;
    try {
      if (options.openInEditor) await options.openInEditor({ ...parsed, file: target.editor?.file ?? parsed.file, source: target.source, page: target.page });
      else {
        const url = target.editor && editorURL(target.editor, target.source, target.page);
        if (!url) throw new Error('missing editor target');
        const response = await fetch(url, { signal: AbortSignal.any([events.signal, AbortSignal.timeout(8000)]), credentials: 'same-origin', redirect: 'error' });
        if (!response.ok) throw new Error('editor request failed');
      }
      status.textContent = 'Editor request sent. If nothing opens, check your development server editor settings.';
    } catch { status.textContent = 'Could not open the source. Copy the file path or configure openInEditor.'; }
    finally { node.disabled = false; }
  }

  async function copyNotes(selected: Annotation[] = notes) {
    if (copying || saving || draft || rebinding || !selected.length) return;
    const output = exportNotes(selected, { detail, format });
    if (!output.trim()) { toast.textContent = 'No data is available for this format. Your clipboard was left unchanged.'; toast.hidden = false; layoutDock(); return; }
    const copiedCount = selected.length;
    copying = true; syncControls(); setMood('copying');
    const showOutput = () => {
      panelView = 'output';
      showPanel();
      const preview = el('textarea', 'output');
      preview.readOnly = true;
      preview.setAttribute('aria-label', 'Output for your coding agent');
      preview.value = output;
      body.replaceChildren(el('p', 'muted', 'Your selections, source locations and change requests in one place.'), preview, button('Back to notes', renderList, 'quiet'));
      return preview;
    };
    if (!panel.hidden) showOutput();
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(output);
      if (!host.isConnected) return;
      setMood('copied', 1600);
      const message = `${copiedCount} note${copiedCount === 1 ? '' : 's'} copied. Ready for your coding agent.`;
      if (!panel.hidden) status.textContent = message;
      else {
        toast.textContent = message; toast.hidden = false; layoutDock();
        clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
      }
    } catch {
      if (!host.isConnected) return;
      const preview = showOutput();
      status.textContent = 'Automatic copying is unavailable. Press Ctrl/Cmd+C to copy the text.';
      preview.focus(); preview.select();
      setMood('error', 500);
    } finally {
      copying = false; syncControls();
    }
  }

  function resolve(item: Annotation): Element | undefined {
    const reference = references.get(item.id);
    if (referenceRevisions.get(item.id) === documentRevision && (!reference || reference.isConnected)) return reference;
    const result: LocationResult = reference?.isConnected && matchesAnnotation(reference, item) ? { status: 'found', element: reference, count: 1 } : locateAnnotation(document, item);
    locations.set(item.id, result);
    const target = result.element;
    if (target) references.set(item.id, target);
    else references.delete(item.id);
    referenceRevisions.set(item.id, documentRevision);
    return target;
  }
  function updateLocationLabels() {
    const labels = { found: 'Target found', ambiguous: 'Multiple matches found', changed: 'Target content or identity has changed', missing: 'Target not found', 'boundary-unavailable': 'Document boundary missing or inaccessible', invalid: 'Invalid location data', 'too-many': 'Too many candidates; target is ambiguous' };
    for (const node of body.querySelectorAll<HTMLElement>('.location-state')) {
      const item = notes.find(item => item.id === node.dataset.noteId);
      if (!item) continue;
      const index = Number(node.dataset.targetIndex), context = item.targets?.[index] ?? item;
      const key = item.targets ? `${item.id}:${index}` : item.id;
      resolve({ ...context, id: key, note: item.note });
      const result = locations.get(key);
      const text = result ? labels[result.status] + (result.status === 'ambiguous' ? ` (${result.count})` : result.element && !hostRect(result.element).visible ? ' · currently hidden' : '') : 'Checking target';
      if (node.textContent !== text) node.textContent = text;
      node.dataset.state = result?.status ?? 'missing';
    }
  }

  function updatePins() {
    const samePage = pageKey(location, options.useHashLocation) === currentPage;
    pins.hidden = !pinsVisible || !samePage;
    groupHighlights.hidden = !samePage;
    if (!samePage) { highlight.hidden = true; return; }
    const visible = new Set<string>();
    const known = new Set<string>();
    notes.forEach((item, index) => {
      (item.targets ?? [item]).forEach((context, targetIndex) => {
        const key = item.targets ? `${item.id}:${targetIndex}` : item.id;
        known.add(key);
        const target = resolve({ ...context, id: key, note: item.note });
        if (!target) return;
        const rect = hostRect(target);
        if (!rect.visible || !rect.width || !rect.height || rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) return;
        visible.add(key);
        let pin = pinElements.get(key);
        if (!pin) {
          const id = item.id;
          pin = button('', () => {
            if (draft) { openToolbar(); return; }
            if (copying) return;
            const current = notes.find(note => note.id === id);
            if (current) {
              setVisible(menu, true);
              toggle.setAttribute('aria-expanded', 'true');
              openEditor(current, current.note, resolve({ ...(current.targets?.[targetIndex] ?? current), id: key, note: current.note }));
            }
          }, 'pin');
          pinElements.set(key, pin);
          pins.append(pin);
        }
        pin.textContent = String(index + 1);
        pin.setAttribute('aria-label', `Edit note ${index + 1}`);
        pin.style.left = `${Math.max(12, Math.min(innerWidth - 12, rect.clip.right, Math.max(rect.clip.left, rect.left + rect.width * (item.anchor?.x ?? 1))))}px`;
        pin.style.top = `${Math.max(12, Math.min(innerHeight - 12, rect.clip.bottom, Math.max(rect.clip.top, rect.top + rect.height * (item.anchor?.y ?? 0))))}px`;
      });
    });
    for (const [id, pin] of pinElements) if (!visible.has(id)) { pin.remove(); pinElements.delete(id); }
    for (const id of references.keys()) if (!known.has(id)) references.delete(id);
    for (const id of referenceRevisions.keys()) if (!known.has(id)) referenceRevisions.delete(id);
    for (const id of locations.keys()) if (!known.has(id)) locations.delete(id);
    if (!panel.hidden && panelView === 'notes') updateLocationLabels();
  }

  let frame = 0;
  function schedulePins() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0; updatePins();
      if (hovered?.isConnected && selecting) showHighlight(hovered);
      else if (draft && draft.page === pageKey(location, options.useHashLocation) && !panel.hidden && draftTarget?.isConnected) showHighlight(draftTarget);
      else highlight.hidden = true;
      positionPanel();
      if (picked.size) updateGroupHighlights();
    });
  }

  function showHighlight(target: Element) {
    let rect = hostRect(target);
    if (draftRange && target === draftTarget && draftRange.startContainer.isConnected) {
      const range = draftRange.getBoundingClientRect();
      const origin = hostPoint(target.ownerDocument, range.left, range.top);
      const end = hostPoint(target.ownerDocument, range.right, range.bottom);
      rect = { left: origin.x, top: origin.y, right: end.x, bottom: end.y, width: end.x - origin.x, height: end.y - origin.y, visible: origin.visible && end.visible, clip: rect.clip };
    }
    const left = Math.max(rect.left, rect.clip.left), top = Math.max(rect.top, rect.clip.top);
    Object.assign(highlight.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(0, Math.min(rect.right, rect.clip.right) - left)}px`, height: `${Math.max(0, Math.min(rect.bottom, rect.clip.bottom) - top)}px` });
    highlight.hidden = !rect.visible;
  }

  function targetFrom(event: Event) {
    if (event.composedPath().includes(host)) return;
    const target = event.composedPath()[0];
    return isElement(target) && !['html', 'body'].includes(target.localName) ? target : undefined;
  }

  function handlePointerMove(event: PointerEvent) {
    const point = hostPoint((event.currentTarget as Window).document, event.clientX, event.clientY);
    if (dockDrag && event.buttons) {
      const dx = point.x - dockDrag.x, dy = point.y - dockDrag.y;
      if (dockDrag.moved || Math.hypot(dx, dy) > 6) {
        // Capture only actual drags: capturing a tap from an SVG child can swallow its click.
        if (!dockDrag.moved) toggle.setPointerCapture(event.pointerId);
        dockDrag.moved = true; dock.dataset.dragging = 'true'; moveDock(dockDrag.right - dx, dockDrag.bottom - dy);
      }
      return;
    }
    if (areaDrag) {
      Object.assign(areaHighlight.style, { left: `${Math.min(point.x, areaDrag.x)}px`, top: `${Math.min(point.y, areaDrag.y)}px`, width: `${Math.abs(point.x - areaDrag.x)}px`, height: `${Math.abs(point.y - areaDrag.y)}px` });
      areaHighlight.hidden = false; return;
    }
    const rect = toggle.getBoundingClientRect();
    const dx = point.x - (rect.left + rect.width / 2);
    const dy = point.y - (rect.top + rect.height / 2);
    const nearby = Math.hypot(dx, dy) < 220 && !reducedMotion.matches;
    dock.style.setProperty('--gaze-x', `${nearby ? Math.max(-3, Math.min(3, dx / 25)) : 0}px`);
    dock.style.setProperty('--gaze-y', `${nearby ? Math.max(-2, Math.min(2, dy / 35)) : 0}px`);
    if (!selecting || draft) return;
    hovered = targetFrom(event);
    if (hovered) showHighlight(hovered); else highlight.hidden = true;
  }
  function handlePointerDown(event: PointerEvent) {
    if (selecting && !draft && (targetFrom(event) || (selectionMode === 'area' && !event.composedPath().includes(host) && isElement(event.composedPath()[0])))) {
      if (selectionMode === 'area') { const point = hostPoint((event.currentTarget as Window).document, event.clientX, event.clientY); areaDrag = { x: point.x, y: point.y }; }
      if (selectionMode !== 'text') event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  function handlePointerUp(event: PointerEvent) {
    if (dockDrag) {
      const moved = dockDrag.moved;
      suppressToggle = moved; dockDrag = undefined; delete dock.dataset.dragging;
      event.stopPropagation();
      if (event.pointerType === 'touch' && !moved) { suppressTouchClick = true; toggle.focus({ preventScroll: true }); toggle.click(); }
      return;
    }
    // Menu items can synthesize a click on pointerup when our pointerdown was intercepted.
    if (selecting && !draft && (areaDrag || targetFrom(event))) event.stopImmediatePropagation();
    if (areaDrag) {
      const point = hostPoint((event.currentTarget as Window).document, event.clientX, event.clientY);
      const area = { left: Math.min(point.x, areaDrag.x), right: Math.max(point.x, areaDrag.x), top: Math.min(point.y, areaDrag.y), bottom: Math.max(point.y, areaDrag.y) };
      picked.clear(); for (const target of elementsInArea(contextRoots, area, host)) picked.add(target);
      areaDrag = undefined; areaHighlight.hidden = true; updateGroupHighlights(); return;
    }
    captureText((event.currentTarget as Window).document);
  }
  function handleClick(event: MouseEvent) {
    if (!selecting || draft) return;
    const target = targetFrom(event);
    if (!target) return;
    event.preventDefault(); event.stopImmediatePropagation();
    refreshRoute();
    if (closestAcross(target, '[data-noktiq-private]')) { hint.textContent = 'This area is marked private. Select another element.'; return; }
    if (selectionMode === 'text') { captureText(target.ownerDocument); return; }
    if (selectionMode === 'area') return;
    if (!rebinding && (selectionMode === 'multi' || event.shiftKey)) {
      if (picked.has(target)) picked.delete(target); else if (picked.size < 50) picked.add(target);
      updateGroupHighlights(); return;
    }
    const rect = target.getBoundingClientRect();
    const anchor = event.detail === 0 ? { x: .5, y: .5 } : {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / (rect.width || 1))),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / (rect.height || 1))),
    };
    const context = { ...contextFor(target, options.useHashLocation), anchor };
    if (rebinding) {
      const original = notes.find(item => item.id === rebinding!.id);
      if (original && (!original.targets ? rebinding.index === 0 : rebinding.index < original.targets.length)) openEditor(replaceTarget(original, context, rebinding.index), original.note, target);
      else {
        selectionMode = rebinding.mode; rebinding = undefined; stopSelecting(); syncControls();
        toast.textContent = 'This note was deleted in another tab.'; toast.hidden = false; layoutDock();
      }
      return;
    }
    openEditor(context, '', target);
  }
  function handleKeydown(event: KeyboardEvent) {
    // Host menus and modal shortcuts must not receive typing or Tab/Escape from our editor.
    if (event.composedPath().includes(host)) event.stopPropagation();
    if (shortcuts && event.altKey && draft && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); changeParent(event.key === 'ArrowDown'); return; }
    const target = event.composedPath()[0];
    if (isElement(target) && closestAcross(target, 'input,textarea,select,[contenteditable]') && event.key !== 'Escape') return;
    if (event.key === 'Escape') { if (!panel.hidden || !menu.hidden || !toast.hidden || selecting) { event.preventDefault(); event.stopPropagation(); closeToolbar(); toggle.focus(); } return; }
    if (!shortcuts) return;
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); if (menu.hidden) openToolbar(); else closeToolbar(); return; }
    if (event.shiftKey && target === toggle && event.key.startsWith('Arrow')) {
      event.preventDefault(); const rect = dock.getBoundingClientRect(); moveDock(innerWidth - rect.right + (event.key === 'ArrowLeft' ? 16 : event.key === 'ArrowRight' ? -16 : 0), innerHeight - rect.bottom + (event.key === 'ArrowUp' ? 16 : event.key === 'ArrowDown' ? -16 : 0)); return;
    }
    if (menu.hidden || draft || rebinding || saving || event.ctrlKey || event.metaKey || event.altKey) return;
    const modes = { e: 'element', t: 'text', m: 'multi', a: 'area' } as const;
    const key = event.key.toLowerCase();
    if (key in modes) { event.preventDefault(); changeMode(modes[key as keyof typeof modes]); }
    else if (key === 'c') { event.preventDefault(); void copyNotes(); }
    else if (key === 'h') { event.preventDefault(); pinsVisible = !pinsVisible; pins.hidden = !pinsVisible; }
    else if (key === 'p') { event.preventDefault(); motion.toggle(contextRoots); }
    else if (event.key === 'Enter' && picked.size) { event.preventDefault(); openGroupEditor(); }
  }
  const stopContexts = watchContexts(host, child => {
    const view = child.defaultView!;
    const controller = new view.AbortController();
    const capture = { capture: true, signal: controller.signal };
    // A navigating frame can reuse its Window; callbacks must belong to one document's signal.
    view.addEventListener('pointermove', event => handlePointerMove(event), capture);
    view.addEventListener('pointerdown', event => handlePointerDown(event), capture);
    view.addEventListener('pointerup', event => handlePointerUp(event), capture);
    view.addEventListener('pointercancel', () => { areaDrag = undefined; suppressToggle = !!dockDrag?.moved; dockDrag = undefined; delete dock.dataset.dragging; areaHighlight.hidden = true; }, capture);
    view.addEventListener('click', event => handleClick(event), capture);
    view.addEventListener('keydown', event => handleKeydown(event), capture);
    if (child === document) {
      view.addEventListener('popstate', refreshRoute, { signal: controller.signal });
      view.addEventListener('hashchange', refreshRoute, { signal: controller.signal });
    }
    view.addEventListener('scroll', () => schedulePins(), { ...capture, passive: true });
    view.addEventListener('resize', () => schedulePins(), { signal: controller.signal });
    return () => controller.abort();
  }, roots => { contextRoots = roots; documentRevision++; refreshRoute(); syncPortal(); motion.refresh(roots); schedulePins(); });
  const resizeObserver = new ResizeObserver(schedulePins);
  window.addEventListener('storage', event => {
    if (event.key !== null && event.key !== `noktiq:v1:${currentPage}`) return;
    notes = load(); references.clear(); referenceRevisions.clear(); locations.clear();
    if (rebinding) {
      const original = notes.find(item => item.id === rebinding!.id);
      if (!original || (original.targets ? rebinding.index >= original.targets.length : rebinding.index !== 0)) {
        selectionMode = rebinding.mode; rebinding = undefined; stopSelecting();
        toast.textContent = 'This note was deleted in another tab.'; toast.hidden = false; layoutDock();
      }
    }
    if (!panel.hidden && !draft && !saving && panelView === 'notes') renderList();
    syncControls(); schedulePins();
  }, { signal: events.signal });
  resizeObserver.observe(panel);
  resizeObserver.observe(menu);
  function refreshRoute() {
    if (pageKey(location, options.useHashLocation) === currentPage) return;
    if (draft) {
      const message = 'The page changed. This note will be saved to the page where you made the selection.';
      if (status.textContent !== message) status.textContent = message;
      highlight.hidden = true;
      return;
    }
    currentPage = pageKey(location, options.useHashLocation);
    picked.clear(); areaDrag = undefined; areaHighlight.hidden = true; hovered = undefined; highlight.hidden = true; updateGroupHighlights();
    if (rebinding) { selectionMode = rebinding.mode; rebinding = undefined; stopSelecting(); }
    notes = load(); references.clear(); referenceRevisions.clear(); locations.clear();
    if (!panel.hidden && panelView === 'notes') renderList(); else syncControls();
    updatePins();
  }
  // Covers history.pushState without patching the application's router.
  const interval = window.setInterval(refreshRoute, 500);
  renderList(); updatePins();
  return () => {
    for (const animation of surfaceAnimations.values()) animation.cancel(); surfaceAnimations.clear();
    events.abort(); stopContexts(); motion.dispose(); resizeObserver.disconnect(); clearInterval(interval); clearTimeout(moodTimer); clearTimeout(toastTimer);
    cancelAnimationFrame(frame); host.remove(); references.clear(); referenceRevisions.clear(); pinElements.clear();
  };
}
