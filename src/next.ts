import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

/** Adds development-only source locations while preserving the application's config. */
export function withNoktiq(config: NextConfig = {}): NextConfig {
  const loader = fileURLToPath(new URL('./webpack-loader.cjs', import.meta.url));
  const [major, minor] = createRequire(resolve(process.cwd(), 'package.json'))('next/package.json').version.split('.').map(Number);
  const modern = major >= 16;
  // Old Turbopack applies .ts loaders to virtual HMR modules before our loader can filter them.
  const pattern = modern ? '*.{js,jsx,ts,tsx}' : '*.{js,jsx,tsx}';
  const legacy = major < 15 || (major === 15 && minor < 3);
  const experimental = config.experimental as typeof config.experimental & { turbo?: NonNullable<NextConfig['turbopack']> };
  const turbo = (legacy ? experimental?.turbo : config.turbopack ?? experimental?.turbo) || {};
  const root = turbo.root || process.cwd();
  const { [pattern]: previous, ...otherRules } = turbo.rules || {};
  const sourceLoader = { loader, options: { root, editor: { kind: 'next', base: config.basePath || '/' }, ...(!modern ? { transpileTypescript: true } : {}) } };
  const previousLoaders = Array.isArray(previous) ? previous : previous?.loaders || [];
  const rules = modern ? {
    [pattern]: [
      { condition: { all: ['development', { not: 'foreign' }] }, loaders: [sourceLoader] },
      ...(previous ? Array.isArray(previous) ? previous : [previous] : []),
    ], ...otherRules,
  } : process.env.NODE_ENV === 'production' ? turbo.rules : {
    [pattern]: { ...(!Array.isArray(previous) ? previous : {}), loaders: [sourceLoader, ...previousLoaders] }, ...otherRules,
  };
  const integration = legacy
    ? { experimental: { ...experimental, turbo: { ...turbo, rules } } }
    : { turbopack: { ...turbo, rules } };
  return {
    ...config,
    // Next 14/15 use rule shapes absent from the current Next type declarations.
    ...(integration as NextConfig),
    webpack(webpackConfig, context) {
      const result = config.webpack?.(webpackConfig, context) || webpackConfig;
      if (context.dev) { result.module ||= {}; result.module.rules ||= []; result.module.rules.unshift({
        test: /\.[jt]sx?$/, exclude: /node_modules/, enforce: 'pre',
        use: [{ loader, options: { root, editor: { kind: 'next', base: config.basePath || '/' } } }],
      }); }
      return result;
    },
  };
}
