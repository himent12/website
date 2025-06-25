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

// Content validation for 69shuba and similar sites
const validateExtractedContent = (extractedData, url) => {
  // Basic content validation
  if (!extractedData.content || extractedData.content.length < 20) {
    return {
      valid: false,
      error: 'Content extraction failed',
      message: 'Unable to extract meaningful content from the webpage. The page might be protected, have a complex structure, require JavaScript rendering, or be a navigation/index page.',
      details: {
        title: extractedData.title,
        contentLength: extractedData.content.length,
        url: url,
        suggestion: 'For novel sites like 69shuba, try using a direct chapter URL instead of the main page.'
      }
    };
  }

  // Special validation for 69shuba.com to detect contaminated content
  if (url.includes('69shuba.com')) {
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
      return {
        valid: false,
        error: 'Content extraction contaminated',
        message: 'The extracted content contains navigation elements and UI text instead of clean chapter content. This usually happens when the scraper captures the wrong page elements.',
        details: {
          title: extractedData.title,
          contentLength: extractedData.content.length,
          contaminated: isContaminated,
          hasChapterStructure: hasChapterStructure,
          contentQualityRatio: Math.round(contentQualityRatio * 1000) / 1000,
          url: url,
          suggestion: 'Try using a direct chapter URL from 69shuba.com, or check if the page structure has changed.'
        }
      };
    }
    
    console.log(`✅ 69shuba content validation passed - clean content with proper chapter structure`);
  }

  return { valid: true };
};

module.exports = {
  validateUrl,
  validateExtractedContent
};