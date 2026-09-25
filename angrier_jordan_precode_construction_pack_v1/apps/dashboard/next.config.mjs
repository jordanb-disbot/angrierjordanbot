export default {
  output: 'standalone',
  webpack(config) {
    // Shared Node ESM sources name their emitted .js files; Next compiles their .ts sources.
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, '.js': ['.ts', '.tsx', '.js'] };
    return config;
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }, { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, private' }] }];
  },
};
