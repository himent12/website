const serverConfig = require('../config/serverConfig');

// Request logging middleware
const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

// Error logging middleware
const errorLogger = (error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    details: serverConfig.isDevelopment ? error.message : undefined
  });
};

module.exports = {
  requestLogger,
  errorLogger
};