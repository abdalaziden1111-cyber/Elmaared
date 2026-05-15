import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/config.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Supplier doc uploads (CR, VAT, portfolio PDF) need up to 10 MB.
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Sentry is an optional dependency — instrumentation files import it
  // dynamically with `.catch(() => null)`. Turbopack still resolves the import
  // statically and reports a "Module not found" warning. Suppress it.
  turbopack: {
    // @sentry/nextjs is an optional dependency; alias it to a local stub so
    // Turbopack stops emitting "Module not found" warnings every compile.
    resolveAlias: {
      '@sentry/nextjs': './lib/utils/sentry-stub.ts',
    },
  },
};

export default withNextIntl(nextConfig);
