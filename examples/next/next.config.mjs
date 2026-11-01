import { withNoktiq } from 'noktiq/next';
import { fileURLToPath } from 'node:url';

export default withNoktiq({
  distDir: `.next-${process.env.NOKTIQ_NEXT_BUNDLER || 'turbopack'}`,
  turbopack: { root: fileURLToPath(new URL('../../', import.meta.url)) },
  devIndicators: false,
});
