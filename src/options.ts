export interface NoktiqOptions {
  portalContainer?: HTMLElement | ShadowRoot | null | (() => HTMLElement | ShadowRoot | null);
  useHashLocation?: boolean;
  enableKeyboardShortcuts?: boolean;
  outputDetail?: import('./output.js').OutputDetail;
  copyFormat?: import('./output.js').CopyFormat;
  openInEditor?: (location: import('./editor.js').SourceLocation) => void | Promise<void>;
}
