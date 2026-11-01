import { createElement as element, memo, forwardRef, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { Noktiq } from 'noktiq/react';
import '../shared.css';
import '../lab.css';
export function FactoryButton() {
  return element('button', { id: 'factory-button', className: 'source-test' }, 'React createElement');
}
export function DynamicButton() {
  const getTag = () => { (window as any).factoryReads = ((window as any).factoryReads || 0) + 1; return 'button'; };
  return element(getTag(), { id: 'dynamic-factory' }, 'Dynamic native factory');
}
const MemoButton = memo(function MemoButton() {
  const untracked = element;
  return untracked('button', { id: 'memo-file-only' }, 'Memo file-only fallback');
});
const RefButton = forwardRef<HTMLButtonElement>(function RefButton(_, ref) {
  const untracked = element;
  return untracked('button', { id: 'ref-file-only', ref }, 'ForwardRef file-only fallback');
});
function ComponentFactory() {
  return element(FactoryButton);
}
function FragmentFactory() {
  return element(Fragment, null, element('button', { id: 'fragment-factory' }, 'Fragment child'));
}
const main = document.createElement('main');
main.innerHTML = '<header class="lab-heading"><div><h1>React · Kaynak çözümleme</h1><p>Her düğmeyi seç; dosya ve satırı kontrol et.</p></div><a href="/lab.html">Laboratuvara dön</a></header>';
const grid = document.createElement('div'); grid.className = 'lab-grid'; main.append(grid); document.body.append(main);
for (const Component of [FactoryButton, DynamicButton, MemoButton, RefButton, ComponentFactory, FragmentFactory]) {
  const section = document.createElement('section'); section.className = 'lab-card'; grid.append(section);
  createRoot(section).render(element(Component));
}
const tools = document.createElement('div'); document.body.append(tools); createRoot(tools).render(element(Noktiq, { enabled: import.meta.env.DEV }));
