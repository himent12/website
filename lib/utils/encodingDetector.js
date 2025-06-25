const iconv = require('iconv-lite');

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

// Decode content based on detected encoding
const decodeContent = (buffer, encoding) => {
  if (encoding === 'gbk' || encoding === 'gb2312') {
    // Decode GBK/GB2312 content
    return iconv.decode(Buffer.from(buffer), 'gbk');
  } else {
    // Handle UTF-8 or other encodings
    return iconv.decode(Buffer.from(buffer), encoding);
  }
};

module.exports = {
  detectEncoding,
  decodeContent
};