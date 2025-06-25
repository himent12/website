// Vercel serverless function for verifying API keys in session

// Helper function to parse cookies from request headers
const parseCookies = (req) => {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=').trim();
      if (name && value) {
        cookies[name.trim()] = decodeURIComponent(value);
      }
    });
  }
  
  return cookies;
};

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
    
    // In serverless environment, check for the secure cookie
    const cookies = parseCookies(req);
    const sessionCookie = cookies[`session-${keyName}`];
    
    if (sessionCookie) {
      try {
        // Decode the session data from the cookie
        const sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
        
        if (sessionData.apiKeys && sessionData.apiKeys[keyName]) {
          res.json({
            hasKey: true,
            metadata: {
              keyName,
              storedAt: sessionData.apiKeys[keyName].storedAt,
              keyLength: sessionData.apiKeys[keyName].keyLength,
              keyPrefix: sessionData.apiKeys[keyName].keyPrefix
            }
          });
        } else {
          res.json({
            hasKey: false
          });
        }
      } catch (decodeError) {
        console.error('Error decoding session cookie:', decodeError);
        res.json({
          hasKey: false
        });
      }
    } else {
      res.json({
        hasKey: false
      });
    }
    
  } catch (error) {
    console.error('Error verifying API key:', error);
    res.status(500).json({
      error: 'Failed to verify API key',
      message: 'An error occurred while verifying the API key'
    });
  }
}