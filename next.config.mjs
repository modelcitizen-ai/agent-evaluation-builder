/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Azure-specific configuration
  output: 'standalone', // Optimizes for Azure deployments
  
  // Optimize build performance and startup time
  experimental: {
    // Improved memory usage and build time
    optimizeCss: true,
    // Enable Turbopack for faster dev builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Handle server-only packages
  serverExternalPackages: ['@azure/openai', '@ai-sdk/azure', 'xlsx', 'sequelize', 'sqlite3'],
  
  // Reduce the bundle size and improve performance (only when not using Turbopack)
  webpack: (config, { isServer, dev }) => {
    // Skip webpack config when using Turbopack in development
    if (dev && process.env.NODE_ENV === 'development') {
      return config;
    }
    
    // Handle large dependencies for faster startup
    if (isServer) {
      config.optimization.minimize = true;
    }
    
    if (!isServer) {
      // Don't resolve these modules on the client side
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        'pg-hstore': false,
      };
    }
    
    return config;
  },
  
  env: {
    // Make environment variables accessible to the client side
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV || 'development',
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  },
  
  // Azure App Service specific configuration
  poweredByHeader: false, // Remove the X-Powered-By header
  compress: true, // Enable compression for better performance
  
  // Increase performance with shorter timeout for static generation
  staticPageGenerationTimeout: 60,
  
  // Ensure API routes are correctly handled
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      }
    ];
  }
};

export default nextConfig;
