const serverConfig = require('./serverConfig');

// CORS configuration based on environment
const getCorsConfig = () => {
  if (serverConfig.isProduction) {
    return {
      origin: ['https://your-domain.com'], // Replace with your actual domain
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      optionsSuccessStatus: 200
    };
  } else {
    // Development: Allow all origins
    console.log('🔧 CORS: Development mode - allowing all origins');
    return {
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      optionsSuccessStatus: 200
    };
  }
};

module.exports = {
  getCorsConfig
};