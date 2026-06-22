import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  async redirects() {
    return [
      // /pescaderia y /tienda → /panel (la carpeta real ahora es /panel)
      { source: '/pescaderia', destination: '/panel', permanent: true },
      { source: '/pescaderia/:path*', destination: '/panel/:path*', permanent: true },
      { source: '/tienda', destination: '/panel', permanent: true },
      { source: '/tienda/:path*', destination: '/panel/:path*', permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "sm-soluciones-informatica",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
