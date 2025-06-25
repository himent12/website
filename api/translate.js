// Vercel serverless function for translation
const { validateTranslationData } = require('../lib/validators/translationValidator');
const { translateText, getTranslationApiKeyFromCookies, handleTranslationError } = require('../lib/services/translationService');

export default async function handler(req, res) {
  console.log(`Translation request: ${req.method} ${req.url}`);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`Invalid method ${req.method}, returning 405`);
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    // Manual JSON parsing if body is string (common in Vercel)
    let parsedBody = req.body;
    if (typeof req.body === 'string') {
      console.log('Parsing JSON body from string');
      try {
        parsedBody = JSON.parse(req.body);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError.message);
        return res.status(400).json({
          error: 'Invalid JSON in request body',
          message: 'Request body must be valid JSON'
        });
      }
    }
    
    // Update req.body with parsed version
    req.body = parsedBody;

    // Validate request using shared validator
    const validation = validateTranslationData(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        message: validation.message
      });
    }

    const { text, from, to, model } = req.body;

    // Get API key from cookies (serverless environment)
    const apiKey = getTranslationApiKeyFromCookies(req);

    // Check if user has provided an API key with enhanced error handling
    if (!apiKey) {
      console.error('❌ No user API key found in session');
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'Please configure your DeepSeek API key in the API Settings tab before using translation.',
        action: 'configure_api_key',
        details: 'Your API key may have expired or been corrupted. Please re-enter it in the API Settings.'
      });
    }

    console.log('Using user-provided API key from encrypted session');

    // Perform translation using shared service
    const result = await translateText(text, from, to, model, apiKey);

    console.log('Translation completed successfully');
    res.json(result);

  } catch (error) {
    console.error('🚨 Translation error caught:', error.message);

    // Enhanced error handling for authentication and session issues
    if (error.message.includes('No user API key provided') ||
        error.message.includes('ENCRYPTION_KEY_MISMATCH') ||
        error.message.includes('DECRYPTION_FAILED') ||
        error.message.includes('bad decrypt')) {
      
      console.error('❌ Authentication/Session error detected');
      return res.status(401).json({
        error: 'Session Authentication Error',
        message: 'Your session has expired or been corrupted. Please re-enter your API key in the API Settings tab.',
        action: 'reconfigure_api_key',
        details: 'This error typically occurs when serverless functions use inconsistent encryption keys. Please refresh and re-enter your API key.'
      });
    }

    // Handle errors using shared error handler for other types of errors
    const errorResponse = handleTranslationError(error);
    
    // Remove sensitive diagnostic information from production responses
    const cleanResponse = {
      error: errorResponse.error,
      message: errorResponse.message
    };
    
    // Only include details in development mode
    if (errorResponse.details && process.env.NODE_ENV !== 'production') {
      cleanResponse.details = errorResponse.details;
    }
    
    res.status(errorResponse.status).json(cleanResponse);
  }
}