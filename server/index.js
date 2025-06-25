require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

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

// Enhanced encoding detection for Chinese sites
const detectEncoding = (response, url) => {
  // Check Content-Type header first
  const contentType = response.headers['content-type'] || '';

  // Look for charset in Content-Type header
  const charsetMatch = contentType.match(/charset=([^;]+)/i);
  if (charsetMatch) {
    const charset = charsetMatch[1].toLowerCase().trim();
    // Normalize common charset names
    if (charset.includes('gb') || charset.includes('gbk') || charset.includes('gb2312')) {
      return 'gbk';
    }
    return charset;
  }

  // Check for BOM or meta tags in content
  const buffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);

  // Check for UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf-8';
  }

  // Try to detect from HTML meta tags (check first 2KB)
  const htmlStart = buffer.toString('ascii', 0, Math.min(2048, buffer.length));

  // Look for meta charset declarations
  const metaCharsetMatch = htmlStart.match(/<meta[^>]+charset\s*=\s*['"]*([^'">\s]+)/i);
  if (metaCharsetMatch) {
    const charset = metaCharsetMatch[1].toLowerCase().trim();
    if (charset.includes('gb') || charset.includes('gbk') || charset.includes('gb2312')) {
      return 'gbk';
    }
    return charset;
  }

  // Domain-based detection for known Chinese sites
  if (url) {
    const domain = url.toLowerCase();
    if (domain.includes('69shuba') || domain.includes('qidian') ||
        domain.includes('zongheng') || domain.includes('17k') ||
        domain.includes('jjwxc') || domain.includes('hongxiu')) {
      // These sites commonly use GBK encoding
      return 'gbk';
    }
  }

  // Try to detect Chinese characters in the content
  // If we see a lot of high-byte characters, it might be GBK
  let highByteCount = 0;
  for (let i = 0; i < Math.min(1000, buffer.length); i++) {
    if (buffer[i] > 127) {
      highByteCount++;
    }
  }

  // If more than 30% are high bytes, likely Chinese content
  if (highByteCount / Math.min(1000, buffer.length) > 0.3) {
    return 'gbk';
  }

  // Default fallback
  return 'utf-8';
};

// Enhanced content extraction for 69shuba and similar sites
const extractContent = (html, url) => {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $('script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar, .nav, .menu').remove();
  $('[class*="ad"], [id*="ad"], [class*="banner"], [id*="banner"]').remove();

  // Try to extract title with multiple strategies
  let title = '';

  // Strategy 1: Page title
  title = $('title').text().trim();

  // Strategy 2: H1 tags
  if (!title || title.length < 5) {
    title = $('h1').first().text().trim();
  }

  // Strategy 3: Specific selectors for novel sites
  if (!title || title.length < 5) {
    const titleSelectors = [
      '.bookname', '.book-name', '.title', '.chapter-title',
      '.article-title', '.post-title', '#title'
    ];

    for (const selector of titleSelectors) {
      const titleEl = $(selector).first();
      if (titleEl.length > 0) {
        title = titleEl.text().trim();
        if (title.length > 5) break;
      }
    }
  }

  // Clean up title
  title = title.replace(/\s+/g, ' ').trim() || 'Scraped Content';

  // Enhanced content extraction with 69shuba-specific selectors
  let content = '';

  // 69shuba and similar novel sites - specific selectors
  const novelSelectors = [
    // 69shuba specific selectors
    '#content', '.content', '#chapter_content', '.chapter-content',
    '.txtnav', '#txtnav', '.readcontent', '.read-content',
    '.novel_content', '#novel_content', '.articlecontent',
    '.yd_text2', '.showtxt', '.bookcontent', '.book-content',
    // Common novel site patterns
    '.chapter_content', '.chaptercontent',
    '.txt', '.text', '#txt', '#text',
    // Generic but targeted selectors
    'div[id*="content"]', 'div[class*="content"]',
    'div[id*="chapter"]', 'div[class*="chapter"]',
    'div[id*="text"]', 'div[class*="text"]',
    'div[id*="read"]', 'div[class*="read"]',
    // Fallback paragraph containers
    '.p', '#p', 'div.p'
  ];

  // Try novel-specific selectors first
  for (const selector of novelSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      let extractedText = element.text().trim();

      // Enhanced noise removal for Chinese novel sites
      extractedText = extractedText
        .replace(/^\s*广告.*$/gm, '') // Remove ad lines
        .replace(/^\s*推荐.*$/gm, '') // Remove recommendation lines
        .replace(/^\s*更新.*$/gm, '') // Remove update lines
        .replace(/^\s*章节.*$/gm, '') // Remove chapter navigation
        .replace(/^\s*目录.*$/gm, '') // Remove table of contents
        .replace(/^\s*书签.*$/gm, '') // Remove bookmark lines
        .replace(/^\s*收藏.*$/gm, '') // Remove collection lines
        .replace(/^\s*投票.*$/gm, '') // Remove voting lines
        .replace(/^\s*评论.*$/gm, '') // Remove comment lines
        .replace(/^\s*上一章.*$/gm, '') // Remove navigation
        .replace(/^\s*下一章.*$/gm, '') // Remove navigation
        .replace(/^\s*返回.*$/gm, '') // Remove return links
        .replace(/^\s*首页.*$/gm, '') // Remove homepage links
        .replace(/^\s*手机.*$/gm, '') // Remove mobile links
        .replace(/^\s*APP.*$/gm, '') // Remove app promotion
        .replace(/\s*\[.*?\]\s*/g, ' ') // Remove bracketed content
        .replace(/\s*（.*?）\s*/g, ' ') // Remove parenthetical content
        .replace(/\s*【.*?】\s*/g, ' ') // Remove bracketed content (Chinese style)
        .replace(/\s*<.*?>\s*/g, ' ') // Remove any remaining HTML tags
        .replace(/\s*&\w+;\s*/g, ' ') // Remove HTML entities
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/^\s+|\s+$/g, '') // Trim
        .trim();

      if (extractedText.length > 200) { // Only use if substantial content
        content = extractedText;
        break;
      }
    }
  }

  // Fallback to general content extraction
  if (!content || content.length < 200) {
    const fallbackSelectors = [
      'main', 'article', '.main', '#main',
      '.post-content', '.entry-content', '.page-content',
      '.container', '.wrapper'
    ];

    for (const selector of fallbackSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        let extractedText = element.text().trim();
        extractedText = extractedText.replace(/\s+/g, ' ').trim();
        if (extractedText.length > 200) {
          content = extractedText;
          break;
        }
      }
    }
  }

  // Last resort: get all meaningful text content
  if (!content || content.length < 100) {
    // Try to get text from various elements, being more inclusive
    const textElements = $('p, div, span, td, li').filter(function() {
      const $el = $(this);
      const text = $el.text().trim();

      // Skip if too short, has scripts/styles, or is likely navigation
      if (text.length < 20) return false;
      if ($el.find('script, style').length > 0) return false;
      if ($el.closest('nav, header, footer, .nav, .menu').length > 0) return false;

      return true;
    });

    const paragraphs = textElements.map((i, el) => {
      const text = $(el).text().trim();
      // Clean up each piece of text
      return text
        .replace(/\s+/g, ' ')
        .replace(/^\s*[\[\]【】()（）]\s*/, '') // Remove leading brackets
        .trim();
    }).get().filter(text => text.length > 10); // Filter out very short pieces

    content = paragraphs.slice(0, 20).join('\n\n').trim(); // Limit to first 20 meaningful pieces
  }

  // Final cleanup
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();

  return {
    title,
    content,
    url,
    wordCount: content ? content.split(/\s+/).length : 0,
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
  // Set proper JSON response headers
  res.setHeader('Content-Type', 'application/json');

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

    // Enhanced axios configuration for Chinese sites
    const axiosConfig = {
      timeout: 45000, // Increased timeout for slower sites
      responseType: 'arraybuffer', // Get raw bytes for encoding detection
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
        // Additional headers to appear more like a real browser
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      },
      maxRedirects: 10,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    };

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
    let html;

    if (encoding === 'gbk' || encoding === 'gb2312') {
      // Decode GBK/GB2312 content
      html = iconv.decode(Buffer.from(response.data), 'gbk');
    } else {
      // Handle UTF-8 or other encodings
      html = iconv.decode(Buffer.from(response.data), encoding);
    }

    console.log(`Detected encoding: ${encoding}, HTML length: ${html.length}`);

    // Extract content from HTML
    const extractedData = extractContent(html, validation.url);

    // More lenient content check - some pages might have less content
    if (!extractedData.content || extractedData.content.length < 20) {
      return res.status(422).json({
        error: 'Content extraction failed',
        message: 'Unable to extract meaningful content from the webpage. The page might be protected, have a complex structure, require JavaScript rendering, or be a navigation/index page.',
        details: {
          title: extractedData.title,
          contentLength: extractedData.content.length,
          encoding: encoding,
          url: validation.url,
          suggestion: 'For novel sites like 69shuba, try using a direct chapter URL instead of the main page.'
        }
      });
    }

    console.log(`Scraping completed successfully. Title: "${extractedData.title}", Content length: ${extractedData.content.length}, Encoding: ${encoding}`);

    return res.status(200).json({
      success: true,
      data: extractedData,
      meta: {
        encoding: encoding,
        processingTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Scraping error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: url,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Ensure we always return JSON
    res.setHeader('Content-Type', 'application/json');

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
        message: 'The website has blocked access to this content. This might be due to anti-scraping measures or geographic restrictions.'
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
