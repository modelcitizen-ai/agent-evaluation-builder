const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file if present
try {
  // First try .env.local (standard Next.js)
  const envLocalPath = path.join(__dirname, '.env.local');
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envLocalPath)) {
    require('dotenv').config({ path: envLocalPath });
    console.log('Loaded environment variables from .env.local file');
  } else if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('Loaded environment variables from .env file');
  } else {
    console.log('No .env file found, using environment variables from system');
  }
} catch (error) {
  console.warn('Error loading environment file:', error.message);
  // Continue even if env file loading fails
}

// Enable detailed startup logging for troubleshooting
console.log('==== SERVER STARTUP DIAGNOSTICS ====');
console.log('Current directory:', __dirname);
console.log('Files in directory:', fs.readdirSync(__dirname).join(', '));
console.log('Node version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'production');

// Environment settings
const dev = false; // Always use production mode in Azure
const hostname = '0.0.0.0';

// Azure App Service may use either PORT or WEBSITES_PORT
// Default to 8080 if neither is set
const port = process.env.WEBSITES_PORT || process.env.PORT || 8080;

console.log('Starting Next.js server in production mode');
console.log('Port:', port);
console.log('Port env vars:', {
  PORT: process.env.PORT,
  WEBSITES_PORT: process.env.WEBSITES_PORT
});
console.log('Node.js version:', process.version);
console.log('Environment variables:', Object.keys(process.env).filter(key => 
  !key.includes('SECRET') && !key.includes('KEY') && !key.includes('PASSWORD')
).join(', '));
console.log('Memory usage:', process.memoryUsage());

// Print out important Node.js modules
try {
  console.log('React version:', require('react').version);
  console.log('Next.js version:', require('next').version);
} catch (err) {
  console.warn('Could not determine React/Next.js versions:', err.message);
}

// Simple health check response
const handleHealthCheck = (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'localStorage',
    version: require('./package.json').version || 'unknown'
  }));
};

// Initialize Next.js with more cautious settings
const app = next({ 
  dev, 
  hostname, 
  port, 
  dir: __dirname,
  conf: {
    compress: true,
    poweredByHeader: false,
    distDir: './.next'
  }
});

const handle = app.getRequestHandler();

// Wrap server creation in a try/catch to catch all possible errors
try {
  // Start the server
  app.prepare()
    .then(() => {
      console.log('Next.js app prepared successfully');
      
      createServer(async (req, res) => {
        try {
          // Log incoming requests for troubleshooting
          console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
          
          const parsedUrl = parse(req.url, true);
          const { pathname } = parsedUrl;
          
          // Health check endpoints for Azure
          if (pathname === '/health' || pathname === '/api/health') {
            return handleHealthCheck(req, res);
          }
          
          await handle(req, res, parsedUrl);
        } catch (err) {
          console.error('Error handling request:', req.url, err);
          console.error('Error stack:', err.stack);
          
          // Send a more detailed error response
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/html');
          res.end(`
            <html>
              <head><title>Server Error</title></head>
              <body>
                <h1>Internal Server Error</h1>
                <p>The server encountered an error while processing your request.</p>
                <p>URL: ${req.url}</p>
                <p>Time: ${new Date().toISOString()}</p>
                <p>Request ID: ${Date.now()}</p>
                <p><a href="/">Return to home page</a></p>
              </body>
            </html>
          `);
        }
      }).listen(port, hostname, (err) => {
        if (err) {
          console.error('Server failed to start:', err);
          throw err;
        }
        console.log(`Server ready on http://${hostname}:${port}`);
        console.log('======== STARTUP COMPLETE ========');
      });
    })
    .catch((err) => {
      console.error('Failed to prepare Next.js app:', err);
      console.error(err.stack);
      process.exit(1);
    });
} catch (err) {
  console.error('Critical error during server startup:', err);
  console.error(err.stack);
  process.exit(1);
}
