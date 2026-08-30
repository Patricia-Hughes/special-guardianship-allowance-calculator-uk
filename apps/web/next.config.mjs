/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: there is no server to secure, and no backend that could
  // receive a carer's financial or family data [R8].
  output: 'export',
  trailingSlash: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  experimental: {
    // The engine and letters packages are workspace TypeScript sources.
    optimizePackageImports: ['@sgo/engine', '@sgo/letters'],
  },
  transpilePackages: ['@sgo/engine', '@sgo/letters'],
};

export default nextConfig;
