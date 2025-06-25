const serverConfig = require('../config/serverConfig');

// Timeout middleware
const timeoutMiddleware = (req, res, next) => {
  // Set larger limits for headers and timeouts
  req.setTimeout(serverConfig.requestTimeout); // 120 seconds timeout (2 minutes)
  res.setTimeout(serverConfig.requestTimeout); // Set response timeout to 2 minutes to match request timeout
  next();
};

module.exports = {
  timeoutMiddleware
};