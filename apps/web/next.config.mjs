import { ReadableAssetsPlugin } from '../../scripts/readable-assets-plugin.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: there is no server to secure, and no backend that could
  // receive a carer's financial or family data [R8].
  output: 'export',
  // The upload ZIP supplies the public origin so copied HTML can still find
  // its CSS and JavaScript. Ordinary local builds keep same-origin paths.
  assetPrefix: process.env.SGO_ASSET_ORIGIN || undefined,
  trailingSlash: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  experimental: {
    // The engine and letters packages are workspace TypeScript sources.
    optimizePackageImports: ['@sgo/engine', '@sgo/letters'],
  },
  transpilePackages: ['@sgo/engine', '@sgo/letters'],
  webpack(config, { dev, isServer }) {
    if (!dev && process.env.SGO_READABLE_BUILD === '1') {
      // Keep production behavior, but emit readable JavaScript and CSS.
      config.optimization.minimize = false;
      if (!isServer) config.plugins.push(new ReadableAssetsPlugin());
    }
    return config;
  },
};

export default nextConfig;
