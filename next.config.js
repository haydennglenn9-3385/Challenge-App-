/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    serverActions: {
      allowedOrigins: ["*"]
    }
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.wixsite.com https://*.editorx.io https://*.wix.com https://www.queersandalliesfitness.com"
          }
        ]
      }
    ]
  }
};

module.exports = nextConfig;