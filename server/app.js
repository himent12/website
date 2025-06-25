const express = require('express');
const serverConfig = require('../lib/config/serverConfig');
const { createCorsMiddleware } = require('../lib/middleware/cors');
const { createSessionMiddleware } = require('../lib/middleware/session');
const { requestLogger, errorLogger } = require('../lib/middleware/logging');
const { timeoutMiddleware } = require('../lib/middleware/timeout');
const { createTranslationRoutes } = require('../lib/routes/translateRoutes');
const { createScrapingRoutes } = require('../lib/routes/scrapeRoutes');
const { createSessionRoutes } = require('../lib/routes/sessionRoutes');
const { createHealthRoutes } = require('../lib/routes/healthRoutes');

// Create Express app
const createApp = () => {
  const app = express();

  // Apply session middleware
  app.use(createSessionMiddleware());

  // Apply CORS middleware
  app.use(createCorsMiddleware());

  // Body parsing middleware
  app.use(express.json({
    limit: serverConfig.jsonLimit,
    parameterLimit: serverConfig.parameterLimit,
    extended: true
  }));
  app.use(express.urlencoded({
    limit: serverConfig.urlEncodedLimit,
    parameterLimit: serverConfig.parameterLimit,
    extended: true
  }));

  // Apply timeout middleware
  app.use(timeoutMiddleware);

  // Apply request logging middleware
  app.use(requestLogger);

  // Create API router
  const apiRouter = express.Router();

  // Apply route handlers
  createHealthRoutes(apiRouter);
  createTranslationRoutes(apiRouter);
  createScrapingRoutes(apiRouter);
  createSessionRoutes(apiRouter);

  // Mount API routes
  app.use('/api', apiRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      message: 'The requested endpoint does not exist'
    });
  });

  // Global error handler
  app.use(errorLogger);

  return app;
};

module.exports = {
  createApp
};