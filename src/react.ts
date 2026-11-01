'use client';
import { useEffect, useRef } from 'react';
import { mountNoktiq } from './index.js';
import type { NoktiqOptions } from './options.js';

export function Noktiq({ enabled = false, ...options }: NoktiqOptions & { enabled?: boolean }) {
  const current = useRef(options); current.current = options;
  useEffect(() => enabled ? mountNoktiq({ ...options, portalContainer: () => {
    const target = current.current.portalContainer;
    return typeof target === 'function' ? target() : target ?? null;
  }, openInEditor: options.openInEditor ? location => current.current.openInEditor?.(location) : undefined }) : undefined, [enabled, options.useHashLocation, options.enableKeyboardShortcuts, options.outputDetail, options.copyFormat, !!options.openInEditor]);
  return null;
}
