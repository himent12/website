// Vercel serverless function for storing API keys in session
const { validateApiKeyFormat } = require('../../lib/validators/sessionValidator');
const { createSessionData } = require('../../lib/services/sessionService');
const { createCookieOptions } = require('../../lib/utils/cookieParser');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    const { keyName, keyValue } = req.body;
    
    // Validate API key format using shared validator
    const validation = validateApiKeyFormat(keyName, keyValue);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        message: validation.message
      });
    }
    
    // Create session data using shared service
    const sessionResult = createSessionData(keyName, keyValue);
    
    // Set secure cookie using shared utility
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = createCookieOptions(keyName, sessionResult.cookieValue, isProduction);
    
    res.setHeader('Set-Cookie', cookieOptions);
    
    console.log(`API key stored in secure cookie for ${keyName}`);
    
    res.json({
      success: true,
      message: 'API key stored successfully',
      metadata: sessionResult.metadata
    });
    
  } catch (error) {
    console.error('Error storing API key:', error);
    res.status(500).json({
      error: 'Failed to store API key',
      message: 'An error occurred while storing the API key'
    });
  }
}