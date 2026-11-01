export interface EditorTarget { kind: 'vite' | 'next'; file: string; base?: string }
export interface SourceLocation { file: string; line: number; column: number; source: string; page: string }
export function parseSource(source?: string) {
  const match = source && /^(.+):(\d+):(\d+)$/.exec(source);
  if (!match || /[\u0000-\u001f]/.test(match[1])) return;
  const line = Number(match[2]), column = Number(match[3]);
  if (!Number.isSafeInteger(line) || !Number.isSafeInteger(column) || line < 1 || column < 1) return;
  return { file: match[1], line, column };
}
export function validEditor(value: unknown): value is EditorTarget {
  if (!value || typeof value !== 'object') return false;
  const editor = value as EditorTarget;
  return ['vite','next'].includes(editor.kind) && typeof editor.file === 'string' && editor.file.length <= 1500 &&
    /^(?:[a-z]:[\\/]|\/(?!\/))/i.test(editor.file) && !/[\u0000-\u001f]/.test(editor.file) &&
    (editor.base === undefined || (typeof editor.base === 'string' && /^\/(?!\/)/.test(editor.base) && !/[?#\\\u0000-\u001f]/.test(editor.base)));
}
export function editorURL(editor: EditorTarget, source: string, page: string): URL | undefined {
  const parsed = parseSource(source);
  if (!parsed || !validEditor(editor)) return;
  const origin = new URL(page);
  if (!['http:', 'https:'].includes(origin.protocol)) return;
  const base = (editor.base || '/').replace(/\/$/, '');
  const url = new URL(`${base}/${editor.kind === 'vite' ? '__open-in-editor' : '__nextjs_launch-editor'}`, origin.origin);
  if (editor.kind === 'vite') url.searchParams.set('file', `${editor.file}:${parsed.line}:${parsed.column}`);
  else { url.searchParams.set('file', editor.file); url.searchParams.set('line1', String(parsed.line)); url.searchParams.set('column1', String(parsed.column)); }
  return url;
}
