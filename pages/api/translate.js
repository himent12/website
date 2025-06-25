// Vercel serverless function for translation API
import OpenAI from 'openai';

// Input validation helper
const validateTranslationRequest = (body) => {
  const { text, from, to } = body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      valid: false,
      error: 'Invalid input: text is required and cannot be empty',
      message: '请输入要翻译的文本 (Please enter text to translate)'
    };
  }

  if (text.length > 20000) {
    return {
      valid: false,
      error: 'Text too long: maximum 20000 characters allowed',
      message: '文本过长：最多允许20000个字符 (Text too long: maximum 20000 characters)'
    };
  }

  if (!from || !to) {
    return {
      valid: false,
      error: 'Invalid input: from and to languages are required',
      message: '请指定源语言和目标语言 (Please specify source and target languages)'
    };
  }

  return { valid: true };
};

// Validate API key format
const validateApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is required' };
  }

  const trimmedKey = apiKey.trim();
  
  if (trimmedKey.length === 0) {
    return { valid: false, error: 'API key cannot be empty' };
  }

  // DeepSeek API key validation
  if (!trimmedKey.startsWith('sk-')) {
    return { valid: false, error: 'DeepSeek API keys must start with "sk-"' };
  }
  
  if (trimmedKey.length < 20 || trimmedKey.length > 100) {
    return { valid: false, error: 'DeepSeek API key length appears invalid' };
  }
  
  // Check for valid characters (alphanumeric, hyphens, underscores)
  if (!/^sk-[A-Za-z0-9_-]+$/.test(trimmedKey)) {
    return { valid: false, error: 'DeepSeek API key contains invalid characters' };
  }

  return { valid: true, key: trimmedKey };
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are allowed for this endpoint'
    });
  }

  const { text, from, to, userApiKey } = req.body;

  try {
    console.log(`Translation request: ${from} -> ${to}, text length: ${text.length}, using user key: ${!!userApiKey}`);

    // Validate request
    const validation = validateTranslationRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        message: validation.message
      });
    }

    // Determine which API key to use
    let apiKeyToUse = userApiKey || process.env.DEEPSEEK_API_KEY;
    
    // Check if any API key is available
    if (!apiKeyToUse || apiKeyToUse === 'your_api_key_here') {
      return res.status(500).json({
        error: 'API configuration error: No API key available',
        message: 'Please configure your API key in the API Settings tab or contact administrator.'
      });
    }

    // Validate API key format
    const keyValidation = validateApiKey(apiKeyToUse);
    if (!keyValidation.valid) {
      return res.status(400).json({
        error: 'Invalid API key format',
        message: keyValidation.error
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

    // Create DeepSeek client
    const deepseek = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: keyValidation.key,
    });

    // Make API call to DeepSeek
    const completion = await deepseek.chat.completions.create({
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

    return res.status(200).json({
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
        message: 'Invalid API key. Please check your API key in the API Settings tab.'
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
    return res.status(500).json({
      error: 'Translation service error',
      message: 'Unable to complete translation. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
