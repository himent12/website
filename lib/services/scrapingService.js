const axios = require('axios');
const { detectEncoding, decodeContent } = require('../utils/encodingDetector');
const { extractContent } = require('../utils/contentExtractor');
const { validateUrl, validateExtractedContent } = require('../validators/urlValidator');

// Create axios configuration for scraping
const createAxiosConfig = () => {
  return {
    timeout: 45000, // Increased timeout for slower sites
    responseType: 'arraybuffer', // Get raw bytes for encoding detection
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,*/*',
      'Accept-Language': 'zh-CN,en'
    },
    maxRedirects: 10,
    validateStatus: function (status) {
      return status >= 200 && status < 400;
    }
  };
};

// Perform web scraping with retry logic
const scrapeWebpage = async (url) => {
  console.log(`Scraping request for URL: ${url}`);

  // Validate URL
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw {
      status: 400,
      error: validation.error,
      message: validation.message
    };
  }

  const axiosConfig = createAxiosConfig();

  // Add delay to avoid being detected as bot
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // Retry logic for handling temporary failures
  let response;
  let lastError;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for URL: ${validation.url}`);

      // Vary the delay between attempts
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt + Math.random() * 3000));
      }

      response = await axios.get(validation.url, axiosConfig);
      break; // Success, exit retry loop

    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed:`, error.message);

      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // For certain errors, don't retry
      if (error.response?.status === 404 || error.response?.status === 403) {
        throw error;
      }
    }
  }

  if (!response.data) {
    throw new Error('Empty response from server');
  }

  // Detect and handle encoding
  const encoding = detectEncoding(response, validation.url);
  const html = decodeContent(response.data, encoding);

  console.log(`Detected encoding: ${encoding}, HTML length: ${html.length}`);

  // Extract content from HTML
  const extractedData = extractContent(html, validation.url);

  // Validate extracted content
  const contentValidation = validateExtractedContent(extractedData, validation.url);
  if (!contentValidation.valid) {
    throw {
      status: 422,
      error: contentValidation.error,
      message: contentValidation.message,
      details: {
        ...contentValidation.details,
        encoding: encoding
      }
    };
  }

  console.log(`Scraping completed successfully. Title: "${extractedData.title}", Content length: ${extractedData.content.length}, Encoding: ${encoding}`);

  return {
    success: true,
    data: extractedData,
    meta: {
      encoding: encoding,
      processingTime: new Date().toISOString()
    }
  };
};

// Handle scraping errors
const handleScrapingError = (error, url) => {
  console.error('Scraping error details:', {
    message: error.message,
    code: error.code,
    status: error.response?.status,
    statusText: error.response?.statusText,
    url: url,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Handle different types of errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return {
      status: 404,
      error: 'Website not found',
      message: 'Unable to connect to the specified website. Please check the URL and try again.'
    };
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return {
      status: 408,
      error: 'Request timeout',
      message: 'The website took too long to respond. Please try again later.'
    };
  }

  if (error.response?.status === 403) {
    return {
      status: 403,
      error: 'Access forbidden',
      message: 'The website has blocked access to this content. This might be due to anti-scraping measures or geographic restrictions.'
    };
  }

  if (error.response?.status === 404) {
    return {
      status: 404,
      error: 'Page not found',
      message: 'The requested page could not be found. Please check the URL and try again.'
    };
  }

  if (error.response?.status >= 500) {
    return {
      status: 502,
      error: 'Server error',
      message: 'The target website is experiencing server issues. Please try again later.'
    };
  }

  // Handle validation errors
  if (error.status && error.error && error.message) {
    return {
      status: error.status,
      error: error.error,
      message: error.message,
      details: error.details
    };
  }

  // Generic error response
  return {
    status: 500,
    error: 'Scraping service error',
    message: 'Unable to scrape the webpage. Please try again later.',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  };
};

module.exports = {
  scrapeWebpage,
  handleScrapingError,
  createAxiosConfig
};