const { validateApiKeyFormat } = require('../validators/sessionValidator');
const { storeApiKeyInSession, verifySessionApiKey, clearSessionApiKey } = require('../services/sessionService');

// Session-based API key management endpoints
const handleStoreKey = (req, res) => {
  try {
    const { keyName, keyValue } = req.body;
    
    // Validate API key format
    const validation = validateApiKeyFormat(keyName, keyValue);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        message: validation.message
      });
    }
    
    // Store API key in session
    const result = storeApiKeyInSession(req, keyName, keyValue);
    
    res.json({
      success: true,
      message: 'API key stored successfully',
      metadata: result.metadata
    });
    
  } catch (error) {
    console.error('Error storing API key:', error);
    res.status(500).json({
      error: 'Failed to store API key',
      message: 'An error occurred while storing the API key'
    });
  }
};

const handleVerifyKey = (req, res) => {
  try {
    const { keyName } = req.query;
    
    if (!keyName) {
      return res.status(400).json({
        error: 'Missing keyName parameter'
      });
    }
    
    const result = verifySessionApiKey(req, keyName);
    res.json(result);
    
  } catch (error) {
    console.error('Error verifying API key:', error);
    res.status(500).json({
      error: 'Failed to verify API key',
      message: 'An error occurred while verifying the API key'
    });
  }
};

const handleClearKey = (req, res) => {
  try {
    const { keyName } = req.body;
    
    if (!keyName) {
      return res.status(400).json({
        error: 'Missing keyName parameter'
      });
    }
    
    const result = clearSessionApiKey(req, keyName);
    res.json(result);
    
  } catch (error) {
    console.error('Error clearing API key:', error);
    res.status(500).json({
      error: 'Failed to clear API key',
      message: 'An error occurred while clearing the API key'
    });
  }
};

// Create session routes
const createSessionRoutes = (router) => {
  router.post('/session/store-key', handleStoreKey);
  router.get('/session/verify-key', handleVerifyKey);
  router.delete('/session/clear-key', handleClearKey);
  return router;
};

module.exports = {
  handleStoreKey,
  handleVerifyKey,
  handleClearKey,
  createSessionRoutes
};