import { sourceTransform } from './source.js';
import type { Plugin } from 'vite';
import { resolve } from 'node:path';

export function noktiq(options: { root?: string } = {}): Plugin {
  let root = '';
  let base = '/';
  return {
    name: 'noktiq:source', apply: 'serve', enforce: 'pre',
    configResolved(config) { root = options.root ? resolve(config.root, options.root) : config.root; base = new URL(config.base, 'http://noktiq.local').pathname; },
    transform(code, id) {
      try { return sourceTransform(code, id, root, { kind: 'vite', base }); }
      catch (error) { this.warn(`Noktiq source metadata: ${error instanceof Error ? error.message : String(error)}`); }
    },
  };
}
