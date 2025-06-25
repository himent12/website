require('dotenv').config();

// Server configuration settings
const serverConfig = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Request limits
  requestTimeout: 120000, // 2 minutes
  jsonLimit: '50mb',
  urlEncodedLimit: '50mb',
  parameterLimit: 100000,
  
  // API configuration
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  deepseekBaseUrl: 'https://api.deepseek.com',
  
  // Security
  sessionSecret: process.env.SESSION_SECRET,
  encryptionKey: process.env.ENCRYPTION_KEY,
  
  // Development flags
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production'
};

module.exports = serverConfig;