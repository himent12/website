require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3001;

// Initialize DeepSeek client using OpenAI SDK
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({
  limit: '50mb',
  parameterLimit: 100000,
  extended: true
}));
app.use(express.urlencoded({
  limit: '50mb',
  parameterLimit: 100000,
  extended: true
}));

// Increase header size limits
app.use((req, res, next) => {
  // Set larger limits for headers
  req.setTimeout(60000); // 60 seconds timeout
  res.setTimeout(60000);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Input validation helper
const validateTranslationRequest = (req, res, next) => {
  const { text, from, to } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input: text is required and cannot be empty',
      message: '请输入要翻译的文本 (Please enter text to translate)'
    });
  }

  if (text.length > 20000) {
    return res.status(400).json({
      error: 'Text too long: maximum 10000 characters allowed',
      message: '文本过长：最多允许10000个字符 (Text too long: maximum 10000 characters)'
    });
  }

  if (!from || !to) {
    return res.status(400).json({
      error: 'Invalid input: from and to languages are required',
      message: '请指定源语言和目标语言 (Please specify source and target languages)'
    });
  }

  next();
};

// URL validation helper for scraper
const validateUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return {
      valid: false,
      error: 'Invalid input: URL is required and cannot be empty',
      message: '请输入有效的URL (Please enter a valid URL)'
    };
  }

  try {
    const urlObj = new URL(url.trim());

    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        error: 'Invalid protocol: Only HTTP and HTTPS URLs are allowed',
        message: '仅支持HTTP和HTTPS协议 (Only HTTP and HTTPS protocols are supported)'
      };
    }

    return { valid: true, url: url.trim() };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format',
      message: 'URL格式无效 (Invalid URL format)'
    };
  }
};

// Extract content from HTML using cheerio
const extractContent = (html, url) => {
  const $ = cheerio.load(html);

  // Remove script and style elements
  $('script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar').remove();

  // Try to extract title
  let title = $('title').text().trim() ||
              $('h1').first().text().trim() ||
              'Scraped Content';

  // Clean up title
  title = title.replace(/\s+/g, ' ').trim();

  // Try different content selectors based on common patterns
  let content = '';

  // For 69shuba and similar novel sites
  const novelSelectors = [
    '#content',
    '.content',
    '#chapter_content',
    '.chapter-content',
    '.novel-content',
    '.text-content',
    '.main-text',
    'div[id*="content"]',
    'div[class*="content"]'
  ];

  // Try novel-specific selectors first
  for (const selector of novelSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      content = element.text().trim();
      if (content.length > 100) { // Only use if substantial content
        break;
      }
    }
  }

  // Fallback to general content extraction
  if (!content || content.length < 100) {
    // Try main content areas
    const fallbackSelectors = [
      'main',
      'article',
      '.main',
      '#main',
      '.post-content',
      '.entry-content',
      '.page-content'
    ];

    for (const selector of fallbackSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 100) {
          break;
        }
      }
    }
  }

  // Last resort: get all paragraph text
  if (!content || content.length < 100) {
    const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
    content = paragraphs.join('\n\n').trim();
  }

  // Clean up content
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return {
    title,
    content,
    url,
    wordCount: content.split(/\s+/).length,
    extractedAt: new Date().toISOString()
  };
};

// Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Chinese-English Translation API Server',
    status: 'running',
    endpoints: {
      translate: 'POST /api/translate',
      scrape: 'POST /api/scrape'
    }
  });
});

// Translation endpoint
app.post('/api/translate', validateTranslationRequest, async (req, res) => {
  const { text, from, to, userApiKey } = req.body;

  try {
    console.log(`Translation request: ${from} -> ${to}, text length: ${text.length}, using user key: ${!!userApiKey}`);

    // Determine which API key to use
    let apiKeyToUse = userApiKey || process.env.DEEPSEEK_API_KEY;

    // Check if any API key is available
    if (!apiKeyToUse || apiKeyToUse === 'your_api_key_here') {
      return res.status(500).json({
        error: 'API configuration error: No API key available',
        message: 'Please configure your API key in the API Settings tab or contact administrator.'
      });
    }

    // Validate user-provided API key format (basic validation)
    if (userApiKey && !userApiKey.startsWith('sk-')) {
      return res.status(400).json({
        error: 'Invalid API key format',
        message: 'DeepSeek API keys must start with "sk-". Please check your API key in the API Settings tab.'
      });
    }

    // Create system prompt for Chinese to English translation
    const systemPrompt = `You are a professional Chinese-to-English translator. Your task is to:
1. Translate the given Chinese text to natural, fluent English
2. Preserve the original meaning and tone
3. Use appropriate English expressions and idioms when suitable
4. Maintain proper grammar and sentence structure
5. For technical terms, use standard English terminology
6. Return ONLY the translated text, no explanations or additional comments

Translate the following Chinese text to English:`;

    // Create DeepSeek client with the appropriate API key
    const clientToUse = userApiKey ?
      new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKeyToUse,
      }) :
      deepseek; // Use the default client

    // Make API call to DeepSeek
    const completion = await clientToUse.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 8000,
      top_p: 0.9
    });

    const translatedText = completion.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error('Empty response from translation service');
    }

    console.log(`Translation completed successfully, output length: ${translatedText.length}`);

    res.json({
      translatedText: translatedText,
      sourceLanguage: from,
      targetLanguage: to,
      originalLength: text.length,
      translatedLength: translatedText.length
    });

  } catch (error) {
    console.error('Translation error:', error);

    // Handle different types of errors
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        error: 'API quota exceeded',
        message: 'Translation service temporarily unavailable due to quota limits. Please try again later.'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'API authentication failed',
        message: 'Translation service authentication error. Please contact administrator.'
      });
    }

    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please wait a moment and try again.'
      });
    }

    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'Request timeout',
        message: 'Translation request timed out. Please try again with shorter text.'
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Translation service error',
      message: 'Unable to complete translation. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Web scraper endpoint
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  try {
    console.log(`Scraping request for URL: ${url}`);

    // Validate URL
    const validation = validateUrl(url);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        message: validation.message
      });
    }

    // Configure axios with appropriate headers and timeout
    const axiosConfig = {
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
      }
    };

    // Fetch the webpage
    const response = await axios.get(validation.url, axiosConfig);

    if (!response.data) {
      throw new Error('Empty response from server');
    }

    // Extract content from HTML
    const extractedData = extractContent(response.data, validation.url);

    if (!extractedData.content || extractedData.content.length < 50) {
      return res.status(422).json({
        error: 'Content extraction failed',
        message: 'Unable to extract meaningful content from the webpage. The page might be protected or have a complex structure.',
        details: {
          title: extractedData.title,
          contentLength: extractedData.content.length
        }
      });
    }

    console.log(`Scraping completed successfully. Title: "${extractedData.title}", Content length: ${extractedData.content.length}`);

    return res.status(200).json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error('Scraping error:', error);

    // Handle different types of errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(404).json({
        error: 'Website not found',
        message: 'Unable to connect to the specified website. Please check the URL and try again.'
      });
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        error: 'Request timeout',
        message: 'The website took too long to respond. Please try again later.'
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'The website has blocked access to this content. This might be due to anti-scraping measures.'
      });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({
        error: 'Page not found',
        message: 'The requested page could not be found. Please check the URL and try again.'
      });
    }

    if (error.response?.status >= 500) {
      return res.status(502).json({
        error: 'Server error',
        message: 'The target website is experiencing server issues. Please try again later.'
      });
    }

    // Generic error response
    return res.status(500).json({
      error: 'Scraping service error',
      message: 'Unable to scrape the webpage. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

app.listen(port, () => {
  console.log(`🚀 Translation API Server running on port ${port}`);
  console.log(`📡 Health check: http://localhost:${port}/api/health`);
  console.log(`🔧 API endpoint: http://localhost:${port}/api/translate`);
  console.log(`🔑 DeepSeek API configured: ${process.env.DEEPSEEK_API_KEY ? 'Yes' : 'No'}`);
});
