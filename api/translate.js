// Vercel serverless function for translation
const { validateTranslationData } = require('../lib/validators/translationValidator');
const { translateText, getTranslationApiKeyFromCookies, handleTranslationError } = require('../lib/services/translationService');

export default async function handler(req, res) {
  // DIAGNOSTIC: Function entry point
  console.log('🚀 DIAGNOSTIC: Translation function started');
  console.log(`   - Timestamp: ${new Date().toISOString()}`);
  console.log(`   - Method: ${req.method}`);
  console.log(`   - URL: ${req.url}`);
  
  // DIAGNOSTIC: Session-based API key system (no environment variables used)
  console.log('🔧 DIAGNOSTIC: User-provided API key system active');
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ DIAGNOSTIC: Handling OPTIONS preflight request');
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`❌ DIAGNOSTIC: Invalid method ${req.method}, returning 405`);
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    // DIAGNOSTIC: Request body parsing
    console.log('📝 DIAGNOSTIC: Request body parsing');
    console.log(`   - Body exists: ${!!req.body}`);
    console.log(`   - Body type: ${typeof req.body}`);
    console.log(`   - Body content: ${JSON.stringify(req.body, null, 2)}`);
    
    // Manual JSON parsing if body is string (common in Vercel)
    let parsedBody = req.body;
    if (typeof req.body === 'string') {
      console.log('🔄 DIAGNOSTIC: Parsing JSON body from string');
      try {
        parsedBody = JSON.parse(req.body);
        console.log(`   - Parsed successfully: ${JSON.stringify(parsedBody, null, 2)}`);
      } catch (parseError) {
        console.error('❌ DIAGNOSTIC: JSON parsing failed:', parseError.message);
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

    // Check if user has provided an API key
    if (!apiKey) {
      console.error('❌ DIAGNOSTIC: No user API key found in session');
      return res.status(401).json({
        error: 'No API key provided',
        message: 'Please configure your DeepSeek API key in the API Settings tab before using translation.'
      });
    }

    console.log(`✅ DIAGNOSTIC: Using user-provided API key from encrypted session`);

    // Perform translation using shared service
    const result = await translateText(text, from, to, model, apiKey);

    console.log('✅ DIAGNOSTIC: Response sent successfully');
    res.json(result);

  } catch (error) {
    console.error('🚨 DIAGNOSTIC: Translation error caught in main try-catch:', error);

    // Handle errors using shared error handler
    const errorResponse = handleTranslationError(error);
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      message: errorResponse.message,
      details: errorResponse.details
    });
  }
}