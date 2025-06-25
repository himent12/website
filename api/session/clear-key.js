// Vercel serverless function for clearing API keys from session
require('dotenv').config();

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

  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only DELETE requests are allowed'
    });
  }

  try {
    const { keyName } = req.body;
    
    if (!keyName) {
      return res.status(400).json({
        error: 'Missing keyName parameter'
      });
    }
    
    // In serverless environment, clear the secure cookie by setting it to expire
    const cookieOptions = [
      `session-${keyName}=`,
      'HttpOnly',
      'Path=/',
      'Max-Age=0', // Expire immediately
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT', // Set to past date
      process.env.NODE_ENV === 'production' ? 'Secure' : '',
      process.env.NODE_ENV === 'production' ? 'SameSite=Strict' : 'SameSite=Lax'
    ].filter(Boolean).join('; ');
    
    res.setHeader('Set-Cookie', cookieOptions);
    
    console.log(`API key cleared from secure cookie for ${keyName}`);
    
    res.json({
      success: true,
      message: 'API key cleared successfully'
    });
    
  } catch (error) {
    console.error('Error clearing API key:', error);
    res.status(500).json({
      error: 'Failed to clear API key',
      message: 'An error occurred while clearing the API key'
    });
  }
}