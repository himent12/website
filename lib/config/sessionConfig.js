const crypto = require('crypto');
const serverConfig = require('./serverConfig');

// Session configuration for secure API key storage
const getSessionConfig = () => {
  return {
    secret: serverConfig.sessionSecret || crypto.randomBytes(64).toString('hex'),
    name: 'translation-session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: serverConfig.isProduction, // HTTPS only in production
      httpOnly: true, // Prevent XSS access to session cookie
      maxAge: 1000 * 60 * 60, // 1 hour session expiration
      sameSite: serverConfig.isProduction ? 'strict' : 'lax' // Allow cross-origin in development
    },
    // Use memory store for development, configure external store for production
    store: undefined // Will use MemoryStore by default
  };
};

module.exports = {
  getSessionConfig
};