/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Internationalization via next-intl
  i18n: undefined, // Handled by next-intl
  
  // Rewrites for API proxy in development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_BACKEND_URL 
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/:path*`
          : 'http://localhost:8000/api/:path*',
      },
      {
        source: '/ws/:path*',
        destination: process.env.NEXT_PUBLIC_WS_BACKEND_URL
          ? `${process.env.NEXT_PUBLIC_WS_BACKEND_URL}/ws/:path*`
          : 'http://localhost:8001/ws/:path*',
      },
    ];
  },

  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },

  // Experimental features
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
