// Vercel serverless function for health check
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

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Chinese-English Translation API Server (Serverless)',
    endpoints: {
      translate: 'POST /api/translate',
      scrape: 'POST /api/scrape',
      storeKey: 'POST /api/session/store-key',
      verifyKey: 'GET /api/session/verify-key',
      clearKey: 'DELETE /api/session/clear-key'
    }
  });
}