const serverConfig = require('../config/serverConfig');

// Health check endpoint handler
const handleHealthCheck = (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: serverConfig.nodeEnv,
    message: 'Chinese-English Translation API Server',
    endpoints: {
      translate: 'POST /api/translate',
      scrape: 'POST /api/scrape',
      storeKey: 'POST /api/session/store-key',
      verifyKey: 'GET /api/session/verify-key',
      clearKey: 'DELETE /api/session/clear-key'
    }
  });
};

// API root endpoint handler
const handleApiRoot = (req, res) => {
  res.json({
    message: 'Chinese-English Translation API Server',
    status: 'running',
    endpoints: {
      translate: 'POST /api/translate',
      scrape: 'POST /api/scrape'
    }
  });
};

// Create health routes
const createHealthRoutes = (router) => {
  router.get('/health', handleHealthCheck);
  router.get('/', handleApiRoot);
  return router;
};

module.exports = {
  handleHealthCheck,
  handleApiRoot,
  createHealthRoutes
};