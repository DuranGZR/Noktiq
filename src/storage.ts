import { readNotes, writeNotes, type Annotation } from './context.js';

export type NoteChange = { type: 'save'; note: Annotation; existing: boolean } | { type: 'delete'; id: string } | { type: 'clear' };
const pending = new Map<string, { base: Annotation[]; changes: NoteChange[] }>();
let database: Promise<IDBDatabase> | undefined;

function applyChange(notes: Annotation[], change: NoteChange): Annotation[] {
  if (change.type === 'clear') return [];
  if (change.type === 'delete') return notes.filter(item => item.id !== change.id);
  if (notes.some(item => item.id === change.note.id)) return notes.map(item => item.id === change.note.id ? change.note : item);
  return change.existing ? notes : [...notes, change.note];
}

export function loadNotes(page: string, fallback: Annotation[] = []): Annotation[] {
  let values: Annotation[];
  const session = pending.get(page);
  try {
    const raw = localStorage.getItem(`noktiq:v1:${page}`);
    values = readNotes({ getItem: () => raw }, '', page);
  } catch { values = session?.base ?? fallback; }
  return session ? session.changes.reduce(applyChange, values) : values;
}

function writeLock<T>(action: () => T): Promise<T> {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('noktiq-write-lock', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('lock');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Note storage coordination is blocked'));
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); database = undefined; };
      request.result.onclose = () => { database = undefined; };
      resolve(request.result);
    };
  }).catch(error => { database = undefined; throw error; });
  return database.then(db => new Promise<T>((resolve, reject) => {
    // A read/write transaction serializes the localStorage update across tabs, including non-secure development origins.
    const transaction = db.transaction('lock', 'readwrite');
    let result: T;
    transaction.objectStore('lock').get('notes').onsuccess = () => {
      try { result = action(); } catch { transaction.abort(); }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Note update failed'));
  }));
}

export async function changeNotes(page: string, change: NoteChange, fallback: Annotation[]) {
  const apply = (durable: boolean) => {
    const current = loadNotes(page, fallback);
    if (change.type === 'save' && change.existing && !current.some(item => item.id === change.note.id)) return { notes: current, stored: !pending.has(page), conflict: 'deleted' as const };
    if (change.type === 'save' && !change.existing && current.length >= 100) return { notes: current, stored: !pending.has(page), conflict: 'limit' as const };
    const values = applyChange(current, change);
    try {
      if (!durable) throw new Error('Note storage coordination is unavailable');
      if (values.length > 100) throw new RangeError('Noktiq note count limit exceeded');
      writeNotes(localStorage, `noktiq:v1:${page}`, values); pending.delete(page);
      return { notes: values, stored: true };
    } catch {
      const session = pending.get(page) ?? { base: current, changes: [] };
      session.changes.push(...(change.type === 'clear' ? current.map(item => ({ type: 'delete' as const, id: item.id })) : [change])); pending.set(page, session);
      return { notes: values, stored: false };
    }
  };
  try { return await writeLock(() => apply(true)); }
  catch { return apply(false); }
}
