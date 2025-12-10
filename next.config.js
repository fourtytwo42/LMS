/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  images: {
    domains: [],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Skip static optimization to avoid prerendering issues with client components
  output: 'standalone',
  // Disable static page generation for error pages
  generateStaticParams: false,
}

module.exports = nextConfig

