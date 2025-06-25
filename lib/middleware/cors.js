const cors = require('cors');
const { getCorsConfig } = require('../config/corsConfig');

// Create CORS middleware
const createCorsMiddleware = () => {
  return cors(getCorsConfig());
};

module.exports = {
  createCorsMiddleware
};