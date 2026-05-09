/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/articles',
        destination: '/feed',
        permanent: true,
      },
      {
        source: '/articles/:slug*',
        destination: '/feed/:slug*',
        permanent: true,
      },
      {
        source: '/columns',
        destination: '/feed',
        permanent: true,
      },
      {
        source: '/columns/:slug*',
        destination: '/feed/:slug*',
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
