const { scrapeWebpage, handleScrapingError } = require('../services/scrapingService');

// Web scraper endpoint handler
const handleScraping = async (req, res) => {
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
};

// Create scraping routes
const createScrapingRoutes = (router) => {
  router.post('/scrape', handleScraping);
  return router;
};

module.exports = {
  handleScraping,
  createScrapingRoutes
};