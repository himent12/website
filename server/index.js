require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const app = express();
const port = process.env.PORT || 5000;

// Session configuration for secure API key storage
const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  name: 'translation-session',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS access to session cookie
    maxAge: 1000 * 60 * 60, // 1 hour session expiration
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' // Allow cross-origin in development
  },
  // Use memory store for development, configure external store for production
  store: undefined // Will use MemoryStore by default
};

// Apply session middleware
app.use(session(sessionConfig));

// Initialize DeepSeek client using OpenAI SDK
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Middleware
// Temporary CORS fix for development - allow all origins in development
if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: ['https://your-domain.com'], // Replace with your actual domain
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
  }));
} else {
  // Development: Allow all origins
  app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
  }));
  console.log('🔧 CORS: Development mode - allowing all origins');
}
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
  req.setTimeout(120000); // 120 seconds timeout (2 minutes)
  res.setTimeout(120000); // FIXED: Set response timeout to 2 minutes to match request timeout
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Server-side encryption utilities for API keys
const ALGORITHM = 'aes-256-cbc';

// Ensure encryption key is exactly 32 bytes for AES-256
const getEncryptionKey = () => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // If key is provided, ensure it's 32 bytes
    const keyBuffer = Buffer.from(envKey, 'hex');
    if (keyBuffer.length === 32) {
      return keyBuffer;
    }
    // If not 32 bytes, hash it to get consistent 32-byte key
    return crypto.createHash('sha256').update(envKey).digest();
  }
  // Generate a new 32-byte key if none provided
  return crypto.randomBytes(32);
};

const ENCRYPTION_KEY = getEncryptionKey();

const encryptApiKey = (apiKey) => {
  try {
    // Generate a random 16-byte IV for each encryption
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt API key');
  }
};

const decryptApiKey = (encryptedData) => {
  try {
    const { encrypted, iv } = encryptedData;
    
    // Convert IV from hex string back to buffer
    const ivBuffer = Buffer.from(iv, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, ivBuffer);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt API key');
  }
};

// Session-based API key management endpoints
app.post('/api/session/store-key', (req, res) => {
  try {
    const { keyName, keyValue } = req.body;
    
    if (!keyName || !keyValue) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both keyName and keyValue are required'
      });
    }
    
    // Validate API key format
    if (keyName === 'deepseek') {
      if (!keyValue.startsWith('sk-')) {
        return res.status(400).json({
          error: 'Invalid API key format',
          message: 'DeepSeek API keys must start with "sk-"'
        });
      }
      
      if (keyValue.length < 20 || keyValue.length > 100) {
        return res.status(400).json({
          error: 'Invalid API key length',
          message: 'DeepSeek API key length appears invalid'
        });
      }
    }
    
    // Encrypt the API key
    const encryptedKey = encryptApiKey(keyValue);
    
    // Store in server-side session
    if (!req.session.apiKeys) {
      req.session.apiKeys = {};
    }
    
    req.session.apiKeys[keyName] = {
      encrypted: encryptedKey.encrypted,
      iv: encryptedKey.iv,
      storedAt: new Date().toISOString(),
      keyLength: keyValue.length,
      keyPrefix: keyValue.substring(0, 6) + '...'
    };
    
    console.log(`API key stored in session for ${keyName}`);
    
    res.json({
      success: true,
      message: 'API key stored successfully',
      metadata: {
        keyName,
        storedAt: req.session.apiKeys[keyName].storedAt,
        keyLength: req.session.apiKeys[keyName].keyLength,
        keyPrefix: req.session.apiKeys[keyName].keyPrefix
      }
    });
    
  } catch (error) {
    console.error('Error storing API key:', error);
    res.status(500).json({
      error: 'Failed to store API key',
      message: 'An error occurred while storing the API key'
    });
  }
});

app.get('/api/session/verify-key', (req, res) => {
  try {
    const { keyName } = req.query;
    
    if (!keyName) {
      return res.status(400).json({
        error: 'Missing keyName parameter'
      });
    }
    
    const hasKey = req.session.apiKeys && req.session.apiKeys[keyName];
    
    if (hasKey) {
      res.json({
        hasKey: true,
        metadata: {
          keyName,
          storedAt: req.session.apiKeys[keyName].storedAt,
          keyLength: req.session.apiKeys[keyName].keyLength,
          keyPrefix: req.session.apiKeys[keyName].keyPrefix
        }
      });
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
});

app.delete('/api/session/clear-key', (req, res) => {
  try {
    const { keyName } = req.body;
    
    if (!keyName) {
      return res.status(400).json({
        error: 'Missing keyName parameter'
      });
    }
    
    if (req.session.apiKeys && req.session.apiKeys[keyName]) {
      delete req.session.apiKeys[keyName];
      console.log(`API key cleared from session for ${keyName}`);
      
      res.json({
        success: true,
        message: 'API key cleared successfully'
      });
    } else {
      res.json({
        success: true,
        message: 'No API key found to clear'
      });
    }
    
  } catch (error) {
    console.error('Error clearing API key:', error);
    res.status(500).json({
      error: 'Failed to clear API key',
      message: 'An error occurred while clearing the API key'
    });
  }
});

// Helper function to get decrypted API key from session
const getSessionApiKey = (req, keyName) => {
  try {
    if (!req.session.apiKeys || !req.session.apiKeys[keyName]) {
      return null;
    }
    
    return decryptApiKey(req.session.apiKeys[keyName]);
  } catch (error) {
    console.error('Error retrieving session API key:', error);
    return null;
  }
};

// Input validation helper
const validateTranslationRequest = (req, res, next) => {
  const { text, from, to, model } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input: text is required and cannot be empty',
      message: '请输入要翻译的文本 (Please enter text to translate)'
    });
  }

  if (text.length > 30000) {
    return res.status(400).json({
      error: 'Text too long: maximum 30000 characters allowed',
      message: '文本过长：最多允许30000个字符 (Text too long: maximum 30000 characters)'
    });
  }

  if (!from || !to) {
    return res.status(400).json({
      error: 'Invalid input: from and to languages are required',
      message: '请指定源语言和目标语言 (Please specify source and target languages)'
    });
  }

  // Validate model parameter if provided
  if (model && typeof model !== 'string') {
    return res.status(400).json({
      error: 'Invalid input: model must be a string',
      message: 'Model parameter must be a valid string'
    });
  }

  const allowedModels = ['deepseek-chat', 'deepseek-reasoner'];
  if (model && !allowedModels.includes(model)) {
    return res.status(400).json({
      error: 'Invalid model: model must be either "deepseek-chat" or "deepseek-reasoner"',
      message: `Allowed models: ${allowedModels.join(', ')}`
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

  // ✅ Enhanced 69shuba content extraction with better container detection
  if (url.includes('69shuba.com')) {
    console.log(`🎯 69shuba.com detected - trying enhanced extraction methods...`);
    
    // 🔍 DIAGNOSTIC: First, let's examine ALL potential content containers
    console.log(`🔍 DIAGNOSTIC: Analyzing page structure for complete content extraction...`);
    console.log(`📄 Total HTML length: ${html.length} characters`);
    
    // Check how many .txtnav elements exist
    const txtnav = $('.txtnav');
    console.log(`📊 Found ${txtnav.length} .txtnav elements`);
    
    if (txtnav.length > 1) {
      console.log(`🔍 Multiple .txtnav elements detected - checking each one:`);
      txtnav.each((index, element) => {
        const text = $(element).text().trim();
        console.log(`   .txtnav[${index}]: ${text.length} characters`);
        console.log(`   Preview: ${text.substring(0, 100)}...`);
      });
    }
    
    // Check for other potential content containers
    const potentialContainers = [
      '.txtnav', '#txtnav', '.readcontent', '#readcontent',
      '.chapter-content', '#chapter-content', '.content', '#content',
      '.bookcontent', '#bookcontent', 'div[class*="txt"]', 'div[id*="txt"]',
      'div[class*="read"]', 'div[id*="read"]', 'div[class*="chapter"]', 'div[id*="chapter"]'
    ];
    
    console.log(`🔍 DIAGNOSTIC: Checking all potential containers:`);
    const containerAnalysis = [];
    
    for (const selector of potentialContainers) {
      const elements = $(selector);
      if (elements.length > 0) {
        const totalText = elements.text().trim();
        containerAnalysis.push({
          selector,
          count: elements.length,
          totalLength: totalText.length,
          preview: totalText.substring(0, 150)
        });
        console.log(`   ${selector}: ${elements.length} elements, ${totalText.length} chars`);
      }
    }
    
    // Sort by content length to find the container with most content
    containerAnalysis.sort((a, b) => b.totalLength - a.totalLength);
    console.log(`🏆 Container with most content: ${containerAnalysis[0]?.selector} (${containerAnalysis[0]?.totalLength} chars)`);
    
    // Try multiple content containers in order of preference - more specific selectors first
    const contentSelectors = [
      '.txtnav',           // Primary content container for 69shuba
      '#txtnav',           // Alternative text nav ID
      '.readcontent',      // Reading content area
      '#readcontent',      // Alternative reading content ID
      '.chapter-content',  // Chapter content class
      '#chapter-content',  // Chapter content ID
      '.content',          // Generic content class
      '#content',          // Main content div
      '.bookcontent',      // Book content container
      '#bookcontent',      // Book content ID
      'div[class*="txt"]', // Any div with txt in class name
      'div[id*="txt"]',    // Any div with txt in ID
      'div[class*="read"]', // Any div with read in class name
      'div[id*="read"]'    // Any div with read in ID
    ];
    
    for (const selector of contentSelectors) {
      const container = $(selector);
      if (container.length > 0) {
        console.log(`🔍 Trying selector: ${selector}, found ${container.length} elements`);
        
        // 🔍 DIAGNOSTIC: If multiple elements, combine them
        let rawText = '';
        if (container.length > 1) {
          console.log(`🔗 Multiple elements found, combining content...`);
          container.each((index, element) => {
            const elementText = $(element).text().trim();
            console.log(`   Element ${index}: ${elementText.length} characters`);
            rawText += elementText + '\n\n';
          });
          rawText = rawText.trim();
        } else {
          rawText = container.text().trim();
        }
        
        console.log(`📏 Raw text length: ${rawText.length} characters`);
        console.log(`📝 Raw text preview: ${rawText.substring(0, 200)}...`);
        console.log(`📝 Raw text ending: ...${rawText.substring(Math.max(0, rawText.length - 300))}`);
        
        // 🔍 DIAGNOSTIC: Check if content actually ends properly
        const endsWithChapterComplete = rawText.includes('(本章完)') || rawText.includes('本章完');
        const lastSentence = rawText.substring(Math.max(0, rawText.length - 100));
        console.log(`🔍 DIAGNOSTIC: Chapter ends properly: ${endsWithChapterComplete}`);
        console.log(`🔍 DIAGNOSTIC: Last sentence: "${lastSentence}"`);
        
        if (rawText.length > 1000) { // Lower threshold but still substantial
          // Enhanced content cleaning for 69shuba
          let cleanText = rawText
            // Remove common 69shuba navigation elements
            .replace(/书页\s*目录\s*设置\s*白天/g, '')
            .replace(/上一章\s*目录\s*下一章/g, '')
            .replace(/上一页\s*目录\s*下一页/g, '')
            .replace(/返回目录\s*上一章\s*下一章/g, '')
            // Remove author and date information
            .replace(/\d{4}-\d{2}-\d{2}\s*作者[：:]\s*[^\n\r]+/g, '')
            .replace(/作者[：:]\s*[^\n\r]+/g, '')
            // Remove reading controls and UI elements
            .replace(/字体大小\s*[+-]\s*/g, '')
            .replace(/背景颜色\s*/g, '')
            .replace(/字体颜色\s*/g, '')
            .replace(/阅读设置\s*/g, '')
            .replace(/护眼模式\s*/g, '')
            .replace(/夜间模式\s*/g, '')
            .replace(/日间模式\s*/g, '')
            // Remove common footer elements
            .replace(/本站域名.*$/gm, '')
            .replace(/请记住本站.*$/gm, '')
            .replace(/如果您喜欢.*$/gm, '')
            // Remove advertisement text
            .replace(/广告.*$/gm, '')
            .replace(/推荐.*小说.*$/gm, '')
            // Clean up whitespace while preserving paragraph structure
            .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
            .replace(/\n[ \t]+/g, '\n') // Remove leading spaces on new lines
            .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces before new lines
            .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
            .trim();
          
          // Validate content quality - check for contamination
          const contaminationPatterns = [
            /书页.*目录.*设置.*白天/,
            /上一章.*目录.*下一章/,
            /字体大小.*背景颜色/,
            /阅读设置.*护眼模式/
          ];
          
          const isContaminated = contaminationPatterns.some(pattern => pattern.test(cleanText));
          
          if (!isContaminated && cleanText.length > 500) {
            console.log(`✅ Successfully extracted clean content from ${selector}: ${cleanText.length} characters`);
            console.log(`📖 Final content preview: ${cleanText.substring(0, 200)}...`);
            
            return {
              title,
              content: cleanText,
              url,
              wordCount: cleanText.split(/\s+/).length,
              extractedAt: new Date().toISOString()
            };
          } else {
            console.log(`❌ Content contaminated or too short from ${selector}: ${cleanText.length} characters, contaminated: ${isContaminated}`);
          }
        } else {
          console.log(`❌ Content too short from ${selector}: ${rawText.length} characters`);
        }
      } else {
        console.log(`❌ Selector ${selector} not found`);
      }
    }
    
    console.log(`⚠️ All 69shuba selectors failed, falling back to comprehensive extraction...`);
  }

  // Enhanced content extraction with 69shuba-specific selectors
  let content = '';

  // Special handling for 69shuba.com - try comprehensive text extraction
  if (url && url.includes('69shuba.com')) {
    console.log(`🎯 Detected 69shuba.com - using specialized comprehensive extraction...`);

    // Get all text content from body
    const bodyText = $('body').text().trim();
    
    if (bodyText.length > 0) {
      console.log(`📄 Total body text length: ${bodyText.length} characters`);
      
      // Look for chapter content pattern - more flexible matching
      const chapterPatterns = [
        /第\s*\d+\s*章[^]*?(?=第\s*\d+\s*章|$)/,  // Standard chapter pattern
        /第[一二三四五六七八九十百千万\d]+章[^]*?(?=第[一二三四五六七八九十百千万\d]+章|$)/, // Chinese numerals
        /(第\s*\d+\s*章.*?)(?=\n\s*第\s*\d+\s*章|\n\s*$|$)/s // More specific with line breaks
      ];
      
      let extractedChapter = null;
      
      for (const pattern of chapterPatterns) {
        const chapterMatch = bodyText.match(pattern);
        if (chapterMatch && chapterMatch[0] && chapterMatch[0].length > 1000) {
          extractedChapter = chapterMatch[0];
          console.log(`📖 Found chapter content with pattern, length: ${extractedChapter.length}`);
          break;
        }
      }
      
      if (extractedChapter) {
        // Enhanced cleaning for 69shuba content
        let cleanChapter = extractedChapter
          // Remove 69shuba specific UI elements
          .replace(/书页\s*目录\s*设置\s*白天/g, '')
          .replace(/上一章\s*目录\s*下一章/g, '')
          .replace(/上一页\s*目录\s*下一页/g, '')
          .replace(/返回目录\s*上一章\s*下一章/g, '')
          // Remove font and display controls
          .replace(/关闭\s*背景\s*字体.*$/gm, '')
          .replace(/雅黑\s*苹方\s*等线.*$/gm, '')
          .replace(/字号.*$/gm, '')
          .replace(/字体大小\s*[+-]\s*/g, '')
          .replace(/背景颜色\s*/g, '')
          .replace(/阅读设置\s*/g, '')
          // Remove author and metadata
          .replace(/\d{4}-\d{2}-\d{2}\s*作者[：:]\s*[^\n\r]+/g, '')
          .replace(/作者[：:]\s*[^\n\r]+/g, '')
          // Remove site-specific elements
          .replace(/本站域名.*$/gm, '')
          .replace(/请记住本站.*$/gm, '')
          .replace(/如果您喜欢.*$/gm, '')
          .replace(/广告.*$/gm, '')
          // Preserve paragraph structure while cleaning whitespace
          .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
          .replace(/\n[ \t]+/g, '\n') // Remove leading spaces on lines
          .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces before newlines
          .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double newlines
          .trim();
        
        // Validate content quality
        const hasChapterStart = /第\s*\d+\s*章/.test(cleanChapter);
        const hasSubstantialContent = cleanChapter.length > 800;
        const contaminationCheck = !/书页.*目录.*设置|字体大小.*背景/.test(cleanChapter);
        
        if (hasChapterStart && hasSubstantialContent && contaminationCheck) {
          content = cleanChapter;
          console.log(`✅ 69shuba comprehensive extraction successful: ${content.length} characters`);
          console.log(`📖 Content preview: ${content.substring(0, 300)}...`);
        } else {
          console.log(`❌ Content validation failed - start: ${hasChapterStart}, length: ${hasSubstantialContent}, clean: ${contaminationCheck}`);
        }
      } else {
        console.log(`❌ No chapter pattern found in body text`);
      }
    }
  }

  // If direct extraction didn't work, fall back to comprehensive approach
  if (!content || content.length < 500) {
    console.log(`🔍 Attempting comprehensive content extraction for potential novel site...`);

    // First, try to get ALL text content from the page, but also try specific containers
  let allTextContent = '';

  // Try to get content from the most likely containers first
  const contentContainers = ['#content', '.content', '.txtnav', '#txtnav', '.readcontent', 'body'];
  for (const container of contentContainers) {
    const containerEl = $(container);
    if (containerEl.length > 0) {
      const containerText = containerEl.text().trim();
      if (containerText.length > allTextContent.length) {
        allTextContent = containerText;
        console.log(`📦 Using content from container: ${container} (${containerText.length} chars)`);
      }
    }
  }

  // Fallback to body if no specific container worked well
  if (allTextContent.length < 500) {
    allTextContent = $('body').text().trim();
    console.log(`📦 Fallback to body content`);
  }

  console.log(`📄 Total page text length: ${allTextContent.length} characters`);

  // Look for chapter markers and extract everything between them
  const chapterStartPattern = /第\s*\d+\s*章/;

  let chapterContent = '';

  // Try to find chapter content by looking for chapter start
  const chapterStartMatch = allTextContent.match(chapterStartPattern);
  if (chapterStartMatch) {
    const startIndex = chapterStartMatch.index;

    // Extract a much larger portion of content to ensure we get the complete chapter
    let extractedContent = allTextContent.substring(startIndex);

    // Minimal content cleaning - only remove obvious UI elements, preserve all story content
    extractedContent = extractedContent
      .replace(/关闭\s*背景\s*字体.*$/gs, '') // Remove font/display controls
      .replace(/雅黑\s*苹方\s*等线.*$/gs, '') // Remove font options
      .replace(/字号.*$/gs, '') // Remove font size controls
      .replace(/\s*-\s*$/, '') // Remove trailing dash
      .trim();

    console.log(`📖 Extracted chapter content: ${extractedContent.length} characters`);

    // Enhanced content cleaning - preserve structure and complete content
    chapterContent = extractedContent
      .replace(/书页\s*目录\s*设置\s*白天/g, '') // Remove navigation elements
      .replace(/上一章\s*目录\s*下一章/g, '') // Remove chapter navigation
      .replace(/关闭\s*背景\s*字体.*$/gs, '') // Remove font/display controls
      .replace(/雅黑\s*苹方\s*等线.*$/gs, '') // Remove font options
      .replace(/字号.*$/gs, '') // Remove font size controls
      .replace(/\s*-\s*$/, '') // Remove trailing dash
      .replace(/\s+/g, ' ') // Normalize whitespace but preserve content
      .replace(/\s*\n\s*/g, '\n') // Clean line breaks
      .trim();

    console.log(`🧹 After enhanced cleaning: ${chapterContent.length} characters`);
    console.log(`📝 Content preview: ${chapterContent.substring(0, 500)}...`);
    console.log(`📝 Content ending: ...${chapterContent.substring(Math.max(0, chapterContent.length - 300))}`);
  }

  // If we found any chapter content, use it (very low threshold to capture all content)
  if (chapterContent.length > 200) {
    content = chapterContent;
    console.log(`✅ Using comprehensive extracted chapter content: ${content.length} characters`);
  } else {
    console.log(`❌ Comprehensive extraction failed (${chapterContent.length} chars), falling back to selector-based approach`);

    // Fallback to original selector-based approach
    const novelSelectors = [
      // Try broader containers first that might contain complete content
      'body', 'html', '#wrapper', '.wrapper', '#container', '.container',
      '#main', '.main', '#page', '.page',
      // 69shuba specific selectors (highest priority - most likely to contain full content)
      '#content', '.content', '#chapter_content', '.chapter-content',
      '.txtnav', '#txtnav', '.readcontent', '.read-content', '#readcontent',
      '.novel_content', '#novel_content', '.articlecontent', '#articlecontent',
      '.yd_text2', '.showtxt', '.bookcontent', '.book-content',
      // Additional 69shuba patterns
      '.chapter_content', '.chaptercontent', '.chapter-text', '.chapter_text',
      '.txt', '.text', '#txt', '#text', '.main-text', '.maintext',
      '.story-content', '.story_content', '.novel-text', '.novel_text',
      // Qidian and similar sites
      '.read-content', '#j_chapterBox', '.chapter-content-wrap',
      '.chapter-body', '.chapter_body', '.text-content', '.text_content',
      // Try very specific 69shuba patterns that might contain complete content
      'div.txtnav', 'div#txtnav', 'div.readcontent', 'div#readcontent',
      'div.content', 'div#content', 'div.chapter_content', 'div#chapter_content',
      // Generic but comprehensive selectors
      'div[id*="content"]', 'div[class*="content"]',
      'div[id*="chapter"]', 'div[class*="chapter"]',
      'div[id*="text"]', 'div[class*="text"]',
      'div[id*="read"]', 'div[class*="read"]',
      'div[id*="novel"]', 'div[class*="novel"]',
      'div[id*="story"]', 'div[class*="story"]',
      // Additional fallback selectors
      '.article-body', '.article_body', '.post-body', '.post_body',
      '.entry-content', '.entry_content', '.page-content', '.page_content',
      // Paragraph containers
      '.p', '#p', 'div.p', '.paragraph', '.paragraphs'
    ];

    // Try novel-specific selectors and collect all potential content
    let potentialContent = [];
    console.log(`🔍 Trying ${novelSelectors.length} novel-specific selectors...`);

    for (const selector of novelSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        let extractedText = element.text().trim();
        console.log(`📝 Found element for selector "${selector}": ${extractedText.length} chars`);

        // Minimal cleaning - preserve almost all content
        extractedText = extractedText
          .replace(/\s*<[^>]*>\s*/g, ' ') // Remove any remaining HTML tags
          .replace(/\s*&[a-zA-Z0-9#]+;\s*/g, ' ') // Remove HTML entities
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        if (extractedText.length > 50) { // Collect all meaningful content (lowered threshold)
          potentialContent.push({
            selector: selector,
            content: extractedText,
            length: extractedText.length
          });
        }
      }
    }

    // Choose the longest content from all matches
    if (potentialContent.length > 0) {
      // Sort by length descending and take the longest
      potentialContent.sort((a, b) => b.length - a.length);
      content = potentialContent[0].content;
      console.log(`✅ Selected content from selector: ${potentialContent[0].selector}, length: ${potentialContent[0].length}`);
      console.log(`📊 All potential matches: ${potentialContent.map(p => `${p.selector}(${p.length})`).join(', ')}`);
      console.log(`📖 Content preview: ${content.substring(0, 200)}...`);
    } else {
      console.log(`❌ No content found with novel-specific selectors`);
    }
  }

  // If no content found yet, continue with fallback methods

  // Fallback to general content extraction - be more aggressive and comprehensive
  if (!content || content.length < 3000) { // Much higher threshold to ensure we get complete content
    console.log(`🔄 Trying fallback selectors (current content length: ${content ? content.length : 0})...`);
    const fallbackSelectors = [
      'main', 'article', '.main', '#main',
      '.post-content', '.entry-content', '.page-content',
      '.container', '.wrapper', '.body-content', '.main-content',
      // Try broader selectors if specific ones fail
      'body > div', '.content-wrapper', '#wrapper',
      // Even broader fallbacks
      'div[class*="main"]', 'div[id*="main"]',
      // Very broad selectors for maximum content capture
      'body', 'html'
    ];

    let fallbackContent = [];

    for (const selector of fallbackSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        let extractedText = element.text().trim();
        // Apply similar cleaning as novel content
        extractedText = extractedText
          .replace(/\s*<[^>]*>\s*/g, ' ') // Remove HTML tags
          .replace(/\s*&[a-zA-Z0-9#]+;\s*/g, ' ') // Remove HTML entities
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        if (extractedText.length > 200) { // Only consider substantial content (lowered threshold)
          fallbackContent.push({
            selector: selector,
            content: extractedText,
            length: extractedText.length
          });
        }
      }
    }

    // Choose the longest fallback content
    if (fallbackContent.length > 0) {
      fallbackContent.sort((a, b) => b.length - a.length);
      content = fallbackContent[0].content;
      console.log(`Selected fallback content from selector: ${fallbackContent[0].selector}, length: ${fallbackContent[0].length}`);
    }
  }

  // Last resort: get all meaningful text content - be very inclusive
  if (!content || content.length < 5000) { // Much higher threshold for complete chapter content
    // Try to get text from various elements, being very inclusive for novel content
    const textElements = $('p, div, span, td, li, pre').filter(function() {
      const $el = $(this);
      const text = $el.text().trim();

      // Be more lenient - only skip very short text or obvious non-content
      if (text.length < 10) return false; // Reduced from 20 to 10
      if ($el.find('script, style').length > 0) return false;
      // Only skip obvious navigation, not all headers/footers which might contain content
      if ($el.closest('nav, .nav, .menu, .navigation').length > 0) return false;
      // Skip obvious ads and promotional content
      if ($el.closest('[class*="ad"], [id*="ad"], [class*="banner"]').length > 0) return false;

      return true;
    });

    const paragraphs = textElements.map((i, el) => {
      const text = $(el).text().trim();
      // More conservative cleanup to preserve content
      return text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/^\s*[\[\]]\s*/, '') // Only remove square brackets at start
        .trim();
    }).get().filter(text => text.length > 5); // Very lenient filter - keep almost everything

    content = paragraphs.slice(0, 500).join('\n\n').trim(); // Allow up to 500 pieces for maximum content capture
  }

  } // Close the if statement for fallback extraction

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
  const { text, from, to, model } = req.body;

  try {
    console.log(`🔍 DIAGNOSTIC: Translation request received`);
    console.log(`   - From: ${from} -> To: ${to}`);
    console.log(`   - Model requested: ${model || 'deepseek-reasoner'}`);
    console.log(`   - Text length: ${text.length}`);
    console.log(`   - Request timestamp: ${new Date().toISOString()}`);

    // Get API key from session storage (server-side)
    let apiKeyToUse = getSessionApiKey(req, 'deepseek');
    
    // Fallback to server's default API key if no session key
    if (!apiKeyToUse) {
      apiKeyToUse = process.env.DEEPSEEK_API_KEY;
    }

    // Check if any API key is available
    if (!apiKeyToUse || apiKeyToUse === 'your_api_key_here') {
      return res.status(500).json({
        error: 'API configuration error: No API key available',
        message: 'Please configure your API key in the API Settings tab or contact administrator.'
      });
    }

    console.log(`Using API key from: ${getSessionApiKey(req, 'deepseek') ? 'session' : 'server environment'}`);

    // FIXED: Use correct DeepSeek API model names based on API documentation
    const modelMapping = {
      'deepseek-chat': 'deepseek-chat',
      'deepseek-reasoner': 'deepseek-reasoner' // Note: This model may not be available or may have different name
    };
    
    const allowedModels = ['deepseek-chat', 'deepseek-reasoner'];
    const requestedModel = model && allowedModels.includes(model) ? model : 'deepseek-chat';
    
    // TEMPORARY FIX: Force deepseek-reasoner requests to use deepseek-chat until we confirm correct model name
    let selectedModel;
    if (requestedModel === 'deepseek-reasoner') {
      console.warn(`⚠️ TEMPORARY: deepseek-reasoner returning empty responses, using deepseek-chat instead`);
      selectedModel = 'deepseek-chat';
    } else {
      selectedModel = modelMapping[requestedModel];
    }
    
    console.log(`🔍 DIAGNOSTIC: Model validation`);
    console.log(`   - Requested model: ${model}`);
    console.log(`   - Allowed models: ${allowedModels.join(', ')}`);
    console.log(`   - Selected model: ${selectedModel}`);
    console.log(`   - Model is valid: ${allowedModels.includes(model)}`);
    console.log(`   - Using fallback: ${requestedModel === 'deepseek-reasoner' ? 'Yes (reasoner->chat)' : 'No'}`);
    
    if (model && !allowedModels.includes(model)) {
      console.warn(`❌ Invalid model "${model}" requested, falling back to deepseek-chat`);
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
    const clientToUse = getSessionApiKey(req, 'deepseek') ?
      new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKeyToUse,
      }) :
      deepseek; // Use the default client

    // Make API call to DeepSeek with selected model and temperature 1.3
    console.log(`🔍 DIAGNOSTIC: Making API call to DeepSeek`);
    console.log(`   - API Base URL: https://api.deepseek.com`);
    console.log(`   - Model: ${selectedModel}`);
    console.log(`   - Temperature: 1.3`);
    console.log(`   - Max tokens: ${selectedModel === 'deepseek-reasoner' ? 64000 : 32000}`);
    console.log(`   - API Key present: ${apiKeyToUse ? 'Yes' : 'No'}`);
    console.log(`   - API Key prefix: ${apiKeyToUse ? apiKeyToUse.substring(0, 8) + '...' : 'None'}`);
    
    const apiRequestStart = Date.now();
    
    const completion = await clientToUse.chat.completions.create({
      model: selectedModel,
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
      temperature: 1.3, // Set temperature to 1.3 as requested
      max_tokens: selectedModel === 'deepseek-reasoner' ? 8192 : 4096, // FIXED: Use realistic token limits
      top_p: 0.9
    });
    
    const apiRequestDuration = Date.now() - apiRequestStart;
    console.log(`✅ API call completed in ${apiRequestDuration}ms`);

    const translatedText = completion.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error('Empty response from translation service');
    }

    console.log(`Translation completed successfully using ${selectedModel}, output length: ${translatedText.length}`);

    res.json({
      translatedText: translatedText,
      sourceLanguage: from,
      targetLanguage: to,
      model: selectedModel,
      temperature: 1.3,
      originalLength: text.length,
      translatedLength: translatedText.length
    });

  } catch (error) {
    console.error('🚨 DIAGNOSTIC: Translation error details:');
    console.error(`   - Error message: ${error.message}`);
    console.error(`   - Error code: ${error.code}`);
    console.error(`   - Error status: ${error.status}`);
    console.error(`   - Error response: ${JSON.stringify(error.response?.data || 'No response data')}`);
    console.error(`   - Full error:`, error);

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

    // Minimal axios configuration to avoid HTTP 431 "Request Header Fields Too Large" error
    const axiosConfig = {
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

    // Enhanced content validation for 69shuba and similar sites
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

    // Special validation for 69shuba.com to detect contaminated content
    if (validation.url.includes('69shuba.com')) {
      const contaminationPatterns = [
        /书页.*目录.*设置.*白天/,
        /上一章.*目录.*下一章/,
        /字体大小.*背景颜色/,
        /阅读设置.*护眼模式/,
        /雅黑.*苹方.*等线/,
        /关闭.*背景.*字体/
      ];
      
      const isContaminated = contaminationPatterns.some(pattern =>
        pattern.test(extractedData.content)
      );
      
      // Check if content has proper chapter structure
      const hasChapterStructure = /第\s*\d+\s*章/.test(extractedData.content);
      
      // Check content quality ratio (should be mostly story content, not UI)
      const totalLength = extractedData.content.length;
      const uiElementsLength = (extractedData.content.match(/书页|目录|设置|白天|上一章|下一章|字体|背景/g) || []).join('').length;
      const contentQualityRatio = uiElementsLength / totalLength;
      
      if (isContaminated || !hasChapterStructure || contentQualityRatio > 0.1) {
        console.log(`❌ 69shuba content validation failed - contaminated: ${isContaminated}, hasChapter: ${hasChapterStructure}, qualityRatio: ${contentQualityRatio.toFixed(3)}`);
        return res.status(422).json({
          error: 'Content extraction contaminated',
          message: 'The extracted content contains navigation elements and UI text instead of clean chapter content. This usually happens when the scraper captures the wrong page elements.',
          details: {
            title: extractedData.title,
            contentLength: extractedData.content.length,
            contaminated: isContaminated,
            hasChapterStructure: hasChapterStructure,
            contentQualityRatio: Math.round(contentQualityRatio * 1000) / 1000,
            encoding: encoding,
            url: validation.url,
            suggestion: 'Try using a direct chapter URL from 69shuba.com, or check if the page structure has changed.'
          }
        });
      }
      
      console.log(`✅ 69shuba content validation passed - clean content with proper chapter structure`);
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

