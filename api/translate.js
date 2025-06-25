// Vercel serverless function for translation
require('dotenv').config();
const OpenAI = require('openai');
const crypto = require('crypto');

// Server-side encryption utilities for API keys
const ALGORITHM = 'aes-256-cbc';

const getEncryptionKey = () => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    const keyBuffer = Buffer.from(envKey, 'hex');
    if (keyBuffer.length === 32) {
      return keyBuffer;
    }
    return crypto.createHash('sha256').update(envKey).digest();
  }
  return crypto.randomBytes(32);
};

const ENCRYPTION_KEY = getEncryptionKey();

const decryptApiKey = (encryptedData) => {
  try {
    const { encrypted, iv } = encryptedData;
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

// Helper function to parse cookies from request headers
const parseCookies = (req) => {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=').trim();
      if (name && value) {
        cookies[name.trim()] = decodeURIComponent(value);
      }
    });
  }
  
  return cookies;
};

// Helper function to get decrypted API key from cookies/headers
const getSessionApiKey = (req, keyName) => {
  try {
    // Parse cookies from request headers
    const cookies = parseCookies(req);
    const sessionCookie = cookies[`session-${keyName}`];
    
    if (!sessionCookie) {
      return null;
    }
    
    const sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    if (!sessionData.apiKeys || !sessionData.apiKeys[keyName]) {
      return null;
    }
    
    return decryptApiKey(sessionData.apiKeys[keyName]);
  } catch (error) {
    console.error('Error retrieving session API key:', error);
    return null;
  }
};

// Input validation helper
const validateTranslationRequest = (req) => {
  const { text, from, to, model } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      valid: false,
      error: 'Invalid input: text is required and cannot be empty',
      message: '请输入要翻译的文本 (Please enter text to translate)'
    };
  }

  if (text.length > 30000) {
    return {
      valid: false,
      error: 'Text too long: maximum 30000 characters allowed',
      message: '文本过长：最多允许30000个字符 (Text too long: maximum 30000 characters)'
    };
  }

  if (!from || !to) {
    return {
      valid: false,
      error: 'Invalid input: from and to languages are required',
      message: '请指定源语言和目标语言 (Please specify source and target languages)'
    };
  }

  if (model && typeof model !== 'string') {
    return {
      valid: false,
      error: 'Invalid input: model must be a string',
      message: 'Model parameter must be a valid string'
    };
  }

  const allowedModels = ['deepseek-chat', 'deepseek-reasoner'];
  if (model && !allowedModels.includes(model)) {
    return {
      valid: false,
      error: 'Invalid model: model must be either "deepseek-chat" or "deepseek-reasoner"',
      message: `Allowed models: ${allowedModels.join(', ')}`
    };
  }

  return { valid: true };
};

// Initialize DeepSeek client
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

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

  try {
    // Validate request
    const validation = validateTranslationRequest(req);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        message: validation.message
      });
    }

    const { text, from, to, model } = req.body;

    console.log(`🔍 DIAGNOSTIC: Translation request received`);
    console.log(`   - From: ${from} -> To: ${to}`);
    console.log(`   - Model requested: ${model || 'deepseek-reasoner'}`);
    console.log(`   - Text length: ${text.length}`);
    console.log(`   - Request timestamp: ${new Date().toISOString()}`);

    // Get API key from session storage or environment
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

    // Model selection logic
    const modelMapping = {
      'deepseek-chat': 'deepseek-chat',
      'deepseek-reasoner': 'deepseek-reasoner'
    };
    
    const allowedModels = ['deepseek-chat', 'deepseek-reasoner'];
    const requestedModel = model && allowedModels.includes(model) ? model : 'deepseek-chat';
    
    // Force deepseek-reasoner requests to use deepseek-chat until we confirm correct model name
    let selectedModel;
    if (requestedModel === 'deepseek-reasoner') {
      console.warn(`⚠️ TEMPORARY: deepseek-reasoner returning empty responses, using deepseek-chat instead`);
      selectedModel = 'deepseek-chat';
    } else {
      selectedModel = modelMapping[requestedModel];
    }
    
    console.log(`🔍 DIAGNOSTIC: Model validation`);
    console.log(`   - Requested model: ${model}`);
    console.log(`   - Selected model: ${selectedModel}`);

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
      deepseek;

    // Make API call to DeepSeek
    console.log(`🔍 DIAGNOSTIC: Making API call to DeepSeek`);
    console.log(`   - Model: ${selectedModel}`);
    console.log(`   - Temperature: 1.3`);
    
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
      temperature: 1.3,
      max_tokens: selectedModel === 'deepseek-reasoner' ? 8192 : 4096,
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
}