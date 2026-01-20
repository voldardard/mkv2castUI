/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Internationalization via next-intl
  i18n: undefined, // Handled by next-intl
  
  // Rewrites for API proxy to Django backend
  // IMPORTANT: /api/auth/* routes are handled by NextAuth (not proxied)
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const wsBackendUrl = process.env.NEXT_PUBLIC_WS_BACKEND_URL || 'http://localhost:8001';
    
    return {
      // beforeFiles runs BEFORE Next.js checks for pages/api routes
      beforeFiles: [],
      
      // afterFiles runs AFTER Next.js checks for pages/api routes
      // This means internal API routes (like /api/auth/[...nextauth]) are matched first
      afterFiles: [
        // Proxy all /api/* EXCEPT /api/auth/* (handled by NextAuth)
        {
          source: '/api/:path((?!auth).*)',
          destination: `${backendUrl}/api/:path*`,
        },
        // WebSocket routes
        {
          source: '/ws/:path*',
          destination: `${wsBackendUrl}/ws/:path*`,
        },
      ],
      
      // fallback runs after static files and pages, for routes that don't exist locally
      fallback: [],
    };
  },

  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },

  // WebAssembly support for ffprobe.wasm
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Exclude test files from production build
    config.module.rules.push({
      test: /jest\.setup\.tsx$/,
      use: 'ignore-loader',
    });
    
    return config;
  },
};

module.exports = nextConfig;
