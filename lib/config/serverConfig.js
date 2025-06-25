require('dotenv').config();

// Server configuration settings - 100% session-based operation
const serverConfig = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Request limits
  requestTimeout: 120000, // 2 minutes
  jsonLimit: '50mb',
  urlEncodedLimit: '50mb',
  parameterLimit: 100000,
  
  // API configuration - NO environment API keys, 100% user-provided
  deepseekBaseUrl: 'https://api.deepseek.com',
  
  // Development flags
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production'
};

module.exports = serverConfig;