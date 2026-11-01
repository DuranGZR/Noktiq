import { closestAcross, hostRect, isElement } from './dom.js';

export function selectedText(document: Document) {
  const selection = document.defaultView?.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const element = isElement(container) ? container : container.parentElement;
  if (!element || closestAcross(element, 'input, textarea, select, [contenteditable], [data-noktiq-private]')) return;
  for (const child of element.querySelectorAll('*')) {
    if (!range.intersectsNode(child)) continue;
    const style = document.defaultView!.getComputedStyle(child);
    if (child.matches('input,textarea,select,script,style,[contenteditable],[data-noktiq-private],[hidden]') || style.display === 'none' || style.visibility === 'hidden') return;
  }
  const text = selection.toString();
  if (!text.trim() || text.length > 1000) return;
  const before = range.cloneRange(); before.selectNodeContents(element); before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const raw = range.toString();
  if (raw.length > 1000) return;
  return { element, range: range.cloneRange(), selectedText: text, textRange: { start, end: start + raw.length, ...(raw !== text ? { text: raw } : {}) } };
}

export function textRangeFor(element: Element, offsets: { start: number; end: number; text?: string }, text: string): Range | undefined {
  if (element.textContent?.slice(offsets.start, offsets.end) !== (offsets.text ?? text)) return;
  const document = element.ownerDocument, range = document.createRange();
  const walker = document.createTreeWalker(element, 4);
  let position = 0, started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const end = position + (node.textContent?.length ?? 0);
    if (!started && offsets.start <= end) { range.setStart(node, offsets.start - position); started = true; }
    if (started && offsets.end <= end) { range.setEnd(node, offsets.end - position); return range; }
    position = end;
  }
}

export function elementsInArea(roots: Array<Document | ShadowRoot>, area: { left: number; top: number; right: number; bottom: number }, host: Element): Element[] {
  const result: Element[] = [];
  for (const root of roots) for (const element of root.querySelectorAll('*')) {
    if (element === host || host.contains(element) || ['html', 'body', 'script', 'style', 'link', 'meta'].includes(element.localName) || closestAcross(element, '[data-noktiq-private]')) continue;
    const rect = hostRect(element);
    if (!rect.visible || !rect.width || !rect.height || rect.left < area.left || rect.top < area.top || rect.right > area.right || rect.bottom > area.bottom) continue;
    if (result.some(parent => parent.contains(element))) continue;
    result.push(element);
    if (result.length === 50) return result;
  }
  return result;
}
