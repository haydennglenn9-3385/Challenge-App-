/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
    serverActions: {
      allowedOrigins: ["*"]
    }
  }
};

module.exports = nextConfig;
