import { resolve } from 'node:path';

/** Keep machine-specific project roots out of published evidence; raw captures stay local. */
export function publicReport(text, root = resolve(import.meta.dirname, '..')) {
  const variants = new Set([root, root.replaceAll('\\', '/'), JSON.stringify(root).slice(1, -1)]);
  for (const value of [...variants].sort((a, b) => b.length - a.length)) text = text.replaceAll(value, '[project]');
  return text;
}
