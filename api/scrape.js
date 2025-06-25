// Vercel serverless function for web scraping
const { scrapeWebpage, handleScrapingError } = require('../lib/services/scrapingService');

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

  // Set proper JSON response headers
  res.setHeader('Content-Type', 'application/json');

  const { url } = req.body;

  try {
    const result = await scrapeWebpage(url);
    return res.status(200).json(result);

  } catch (error) {
    const errorResponse = handleScrapingError(error, url);
    
    // Ensure we always return JSON
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(errorResponse.status).json({
      error: errorResponse.error,
      message: errorResponse.message,
      details: errorResponse.details
    });
  }
}