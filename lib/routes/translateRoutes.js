const { validateTranslationRequest } = require('../validators/translationValidator');
const { translateText, getTranslationApiKey, handleTranslationError } = require('../services/translationService');

// Translation endpoint handler
const handleTranslation = async (req, res) => {
  const { text, from, to, model } = req.body;

  try {
    // Get API key for translation
    const apiKey = getTranslationApiKey(req);

    // Perform translation
    const result = await translateText(text, from, to, model, apiKey);

    res.json(result);

  } catch (error) {
    const errorResponse = handleTranslationError(error);
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      message: errorResponse.message,
      details: errorResponse.details
    });
  }
};

// Create translation routes
const createTranslationRoutes = (router) => {
  router.post('/translate', validateTranslationRequest, handleTranslation);
  return router;
};

module.exports = {
  handleTranslation,
  createTranslationRoutes
};