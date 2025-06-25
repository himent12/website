// Vercel serverless function for verifying API keys in session
const { verifySessionApiKeyFromCookies } = require('../../lib/services/sessionService');

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

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are allowed'
    });
  }

  try {
    const { keyName } = req.query;
    
    if (!keyName) {
      return res.status(400).json({
        error: 'Missing keyName parameter'
      });
    }
    
    // Verify API key using shared service
    const result = verifySessionApiKeyFromCookies(req, keyName);
    res.json(result);
    
  } catch (error) {
    console.error('Error verifying API key:', error);
    res.status(500).json({
      error: 'Failed to verify API key',
      message: 'An error occurred while verifying the API key'
    });
  }
}