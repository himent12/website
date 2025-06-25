/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable API routes
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  
  // For React app compatibility
  trailingSlash: false,
  
  // Environment variables
  env: {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  },
  
  // Headers for CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // Rewrites for API compatibility
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/pages/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
