// Vercel serverless function for web scraping
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

// URL validation helper
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

  // Enhanced 69shuba content extraction with better container detection
  if (url.includes('69shuba.com')) {
    console.log(`🎯 69shuba.com detected - trying enhanced extraction methods...`);
    
    // Check how many .txtnav elements exist
    const txtnav = $('.txtnav');
    console.log(`📊 Found ${txtnav.length} .txtnav elements`);
    
    // Try multiple content containers in order of preference
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
        
        // If multiple elements, combine them
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
        
        if (rawText.length > 1000) {
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

    // Try to get content from the most likely containers first
    let allTextContent = '';
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
    }

    // If we found any chapter content, use it
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
        '.chapter-body', '.chapter_body', '.text-content', '.text_content'
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

          if (extractedText.length > 50) {
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
      } else {
        console.log(`❌ No content found with novel-specific selectors`);
      }
    }
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
}