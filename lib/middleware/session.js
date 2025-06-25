const session = require('express-session');
const { getSessionConfig } = require('../config/sessionConfig');

// Create session middleware
const createSessionMiddleware = () => {
  return session(getSessionConfig());
};

module.exports = {
  createSessionMiddleware
};