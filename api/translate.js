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
  console.log(`🍪 DIAGNOSTIC: getSessionApiKey called for keyName: ${keyName}`);
  try {
    // Parse cookies from request headers
    const cookies = parseCookies(req);
    console.log(`   - Parsed cookies: ${JSON.stringify(Object.keys(cookies), null, 2)}`);
    
    const sessionCookie = cookies[`session-${keyName}`];
    console.log(`   - Session cookie exists: ${!!sessionCookie}`);
    console.log(`   - Session cookie length: ${sessionCookie?.length || 0}`);
    
    if (!sessionCookie) {
      console.log('   - No session cookie found, returning null');
      return null;
    }
    
    console.log('   - Attempting to decode base64 session cookie');
    const sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    console.log(`   - Session data keys: ${JSON.stringify(Object.keys(sessionData), null, 2)}`);
    console.log(`   - Session data has apiKeys: ${!!sessionData.apiKeys}`);
    console.log(`   - Session data apiKeys keys: ${sessionData.apiKeys ? JSON.stringify(Object.keys(sessionData.apiKeys), null, 2) : 'N/A'}`);
    
    if (!sessionData.apiKeys || !sessionData.apiKeys[keyName]) {
      console.log(`   - No API key found for ${keyName} in session data`);
      return null;
    }
    
    console.log('   - Attempting to decrypt API key');
    const decryptedKey = decryptApiKey(sessionData.apiKeys[keyName]);
    console.log(`   - Decryption successful: ${!!decryptedKey}`);
    console.log(`   - Decrypted key length: ${decryptedKey?.length || 0}`);
    
    return decryptedKey;
  } catch (error) {
    console.error('❌ DIAGNOSTIC: Error retrieving session API key:', error.message);
    console.error(`   - Error stack: ${error.stack}`);
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
  // DIAGNOSTIC: Function entry point
  console.log('🚀 DIAGNOSTIC: Translation function started');
  console.log(`   - Timestamp: ${new Date().toISOString()}`);
  console.log(`   - Method: ${req.method}`);
  console.log(`   - URL: ${req.url}`);
  console.log(`   - Headers: ${JSON.stringify(req.headers, null, 2)}`);
  
  // DIAGNOSTIC: Environment variables check
  console.log('🔧 DIAGNOSTIC: Environment variables check');
  console.log(`   - DEEPSEEK_API_KEY exists: ${!!process.env.DEEPSEEK_API_KEY}`);
  console.log(`   - DEEPSEEK_API_KEY length: ${process.env.DEEPSEEK_API_KEY?.length || 0}`);
  console.log(`   - DEEPSEEK_API_KEY starts with sk-: ${process.env.DEEPSEEK_API_KEY?.startsWith('sk-') || false}`);
  console.log(`   - SESSION_SECRET exists: ${!!process.env.SESSION_SECRET}`);
  console.log(`   - SESSION_SECRET is placeholder: ${process.env.SESSION_SECRET === 'your-super-secret-session-key-change-this-in-production'}`);
  console.log(`   - ENCRYPTION_KEY exists: ${!!process.env.ENCRYPTION_KEY}`);
  console.log(`   - ENCRYPTION_KEY is placeholder: ${process.env.ENCRYPTION_KEY === 'your-32-byte-encryption-key-change-this-in-production'}`);
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ DIAGNOSTIC: Handling OPTIONS preflight request');
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`❌ DIAGNOSTIC: Invalid method ${req.method}, returning 405`);
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    // DIAGNOSTIC: Request body parsing
    console.log('📝 DIAGNOSTIC: Request body parsing');
    console.log(`   - Body exists: ${!!req.body}`);
    console.log(`   - Body type: ${typeof req.body}`);
    console.log(`   - Body content: ${JSON.stringify(req.body, null, 2)}`);
    
    // Manual JSON parsing if body is string (common in Vercel)
    let parsedBody = req.body;
    if (typeof req.body === 'string') {
      console.log('🔄 DIAGNOSTIC: Parsing JSON body from string');
      try {
        parsedBody = JSON.parse(req.body);
        console.log(`   - Parsed successfully: ${JSON.stringify(parsedBody, null, 2)}`);
      } catch (parseError) {
        console.error('❌ DIAGNOSTIC: JSON parsing failed:', parseError.message);
        return res.status(400).json({
          error: 'Invalid JSON in request body',
          message: 'Request body must be valid JSON'
        });
      }
    }
    
    // Update req.body with parsed version
    req.body = parsedBody;

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

    // DIAGNOSTIC: API key retrieval
    console.log('🔑 DIAGNOSTIC: API key retrieval process');
    
    // Get API key from session storage or environment
    let sessionApiKey;
    try {
      sessionApiKey = getSessionApiKey(req, 'deepseek');
      console.log(`   - Session API key retrieval: ${sessionApiKey ? 'SUCCESS' : 'FAILED/NULL'}`);
      if (sessionApiKey) {
        console.log(`   - Session API key length: ${sessionApiKey.length}`);
        console.log(`   - Session API key starts with sk-: ${sessionApiKey.startsWith('sk-')}`);
      }
    } catch (sessionError) {
      console.error('❌ DIAGNOSTIC: Session API key retrieval error:', sessionError.message);
      sessionApiKey = null;
    }
    
    let apiKeyToUse = sessionApiKey;
    
    // Fallback to server's default API key if no session key
    if (!apiKeyToUse) {
      apiKeyToUse = process.env.DEEPSEEK_API_KEY;
      console.log(`   - Fallback to environment API key: ${!!apiKeyToUse}`);
      if (apiKeyToUse) {
        console.log(`   - Environment API key length: ${apiKeyToUse.length}`);
        console.log(`   - Environment API key starts with sk-: ${apiKeyToUse.startsWith('sk-')}`);
      }
    }

    // Check if any API key is available
    if (!apiKeyToUse || apiKeyToUse === 'your_api_key_here') {
      console.error('❌ DIAGNOSTIC: No valid API key available');
      return res.status(500).json({
        error: 'API configuration error: No API key available',
        message: 'Please configure your API key in the API Settings tab or contact administrator.'
      });
    }

    console.log(`✅ DIAGNOSTIC: Using API key from: ${sessionApiKey ? 'session' : 'server environment'}`);

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

    // DIAGNOSTIC: OpenAI client creation
    console.log('🤖 DIAGNOSTIC: OpenAI client creation');
    let clientToUse;
    try {
      if (sessionApiKey) {
        console.log('   - Creating new OpenAI client with session API key');
        clientToUse = new OpenAI({
          baseURL: 'https://api.deepseek.com',
          apiKey: apiKeyToUse,
        });
      } else {
        console.log('   - Using pre-initialized deepseek client');
        clientToUse = deepseek;
      }
      console.log('✅ DIAGNOSTIC: OpenAI client created successfully');
    } catch (clientError) {
      console.error('❌ DIAGNOSTIC: OpenAI client creation failed:', clientError.message);
      throw new Error(`Failed to create OpenAI client: ${clientError.message}`);
    }

    // DIAGNOSTIC: API request preparation
    console.log('📡 DIAGNOSTIC: Preparing API request');
    console.log(`   - Model: ${selectedModel}`);
    console.log(`   - Temperature: 1.3`);
    console.log(`   - Max tokens: ${selectedModel === 'deepseek-reasoner' ? 8192 : 4096}`);
    console.log(`   - System prompt length: ${systemPrompt.length}`);
    console.log(`   - User text length: ${text.length}`);
    
    const apiRequestStart = Date.now();
    console.log('🚀 DIAGNOSTIC: Making API call to DeepSeek...');
    
    let completion;
    try {
      completion = await clientToUse.chat.completions.create({
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
      console.log(`✅ DIAGNOSTIC: API call completed successfully in ${apiRequestDuration}ms`);
      console.log(`   - Response choices length: ${completion.choices?.length || 0}`);
      console.log(`   - First choice message exists: ${!!completion.choices?.[0]?.message}`);
      console.log(`   - First choice content length: ${completion.choices?.[0]?.message?.content?.length || 0}`);
      
    } catch (apiError) {
      const apiRequestDuration = Date.now() - apiRequestStart;
      console.error(`❌ DIAGNOSTIC: API call failed after ${apiRequestDuration}ms`);
      console.error(`   - Error type: ${apiError.constructor.name}`);
      console.error(`   - Error message: ${apiError.message}`);
      console.error(`   - Error code: ${apiError.code}`);
      console.error(`   - Error status: ${apiError.status}`);
      console.error(`   - Error response: ${JSON.stringify(apiError.response?.data, null, 2)}`);
      throw apiError; // Re-throw to be handled by outer catch
    }

    // DIAGNOSTIC: Response processing
    console.log('📤 DIAGNOSTIC: Processing API response');
    const translatedText = completion.choices[0]?.message?.content?.trim();
    console.log(`   - Translated text exists: ${!!translatedText}`);
    console.log(`   - Translated text length: ${translatedText?.length || 0}`);
    console.log(`   - Translated text preview: ${translatedText?.substring(0, 100)}...`);

    if (!translatedText) {
      console.error('❌ DIAGNOSTIC: Empty response from translation service');
      throw new Error('Empty response from translation service');
    }

    console.log(`✅ DIAGNOSTIC: Translation completed successfully using ${selectedModel}`);
    console.log(`   - Original text length: ${text.length}`);
    console.log(`   - Translated text length: ${translatedText.length}`);

    // DIAGNOSTIC: Preparing response
    console.log('📋 DIAGNOSTIC: Preparing JSON response');
    const responseData = {
      translatedText: translatedText,
      sourceLanguage: from,
      targetLanguage: to,
      model: selectedModel,
      temperature: 1.3,
      originalLength: text.length,
      translatedLength: translatedText.length
    };
    console.log(`   - Response data: ${JSON.stringify(responseData, null, 2)}`);

    res.json(responseData);
    console.log('✅ DIAGNOSTIC: Response sent successfully');

  } catch (error) {
    console.error('🚨 DIAGNOSTIC: Translation error caught in main try-catch:');
    console.error(`   - Error type: ${error.constructor.name}`);
    console.error(`   - Error message: ${error.message}`);
    console.error(`   - Error code: ${error.code}`);
    console.error(`   - Error status: ${error.status}`);
    console.error(`   - Error stack: ${error.stack}`);
    console.error(`   - Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);

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