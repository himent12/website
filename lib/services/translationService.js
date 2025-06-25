const OpenAI = require('openai');
const serverConfig = require('../config/serverConfig');
const { getSessionApiKey, getSessionApiKeyFromCookies } = require('./sessionService');

// Initialize DeepSeek client using OpenAI SDK
const createDeepSeekClient = (apiKey) => {
  return new OpenAI({
    baseURL: serverConfig.deepseekBaseUrl,
    apiKey: apiKey,
  });
};

// Default client for server environment
let defaultClient = null;
if (serverConfig.deepseekApiKey) {
  defaultClient = createDeepSeekClient(serverConfig.deepseekApiKey);
}

// Get API key for translation (server environment)
const getTranslationApiKey = (req) => {
  // Get API key from session storage (server-side)
  let apiKeyToUse = getSessionApiKey(req, 'deepseek');
  
  // Fallback to server's default API key if no session key
  if (!apiKeyToUse) {
    apiKeyToUse = serverConfig.deepseekApiKey;
  }

  return apiKeyToUse;
};

// Get API key for translation (serverless environment)
const getTranslationApiKeyFromCookies = (req) => {
  // ONLY use user-provided API key from session - NO environment fallback
  return getSessionApiKeyFromCookies(req, 'deepseek');
};

// Create system prompt for Chinese to English translation
const createSystemPrompt = () => {
  return `You are a professional Chinese-to-English translator. Your task is to:
1. Translate the given Chinese text to natural, fluent English
2. Preserve the original meaning and tone
3. Use appropriate English expressions and idioms when suitable
4. Maintain proper grammar and sentence structure
5. For technical terms, use standard English terminology
6. Return ONLY the translated text, no explanations or additional comments

Translate the following Chinese text to English:`;
};

// Model selection and validation
const selectModel = (requestedModel) => {
  const modelMapping = {
    'deepseek-chat': 'deepseek-chat',
    'deepseek-reasoner': 'deepseek-reasoner'
  };
  
  const allowedModels = ['deepseek-chat', 'deepseek-reasoner'];
  const selectedModel = requestedModel && allowedModels.includes(requestedModel) ? requestedModel : 'deepseek-chat';
  
  // TEMPORARY FIX: Force deepseek-reasoner requests to use deepseek-chat until we confirm correct model name
  if (selectedModel === 'deepseek-reasoner') {
    console.warn(`⚠️ TEMPORARY: deepseek-reasoner returning empty responses, using deepseek-chat instead`);
    return 'deepseek-chat';
  }
  
  return modelMapping[selectedModel];
};

// Perform translation using DeepSeek API
const translateText = async (text, from, to, model, apiKey) => {
  console.log(`🔍 DIAGNOSTIC: Translation request received`);
  console.log(`   - From: ${from} -> To: ${to}`);
  console.log(`   - Model requested: ${model || 'deepseek-reasoner'}`);
  console.log(`   - Text length: ${text.length}`);
  console.log(`   - Request timestamp: ${new Date().toISOString()}`);

  // Check if any API key is available
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('API configuration error: No API key available');
  }

  console.log(`Using API key from: ${apiKey === serverConfig.deepseekApiKey ? 'server environment' : 'session'}`);

  // Select and validate model
  const selectedModel = selectModel(model);
  
  console.log(`🔍 DIAGNOSTIC: Model validation`);
  console.log(`   - Requested model: ${model}`);
  console.log(`   - Selected model: ${selectedModel}`);

  // Create system prompt
  const systemPrompt = createSystemPrompt();

  // Create DeepSeek client with the appropriate API key
  const clientToUse = createDeepSeekClient(apiKey);

  // Make API call to DeepSeek with selected model and temperature 1.3
  console.log(`🔍 DIAGNOSTIC: Making API call to DeepSeek`);
  console.log(`   - API Base URL: ${serverConfig.deepseekBaseUrl}`);
  console.log(`   - Model: ${selectedModel}`);
  console.log(`   - Temperature: 1.3`);
  console.log(`   - Max tokens: ${selectedModel === 'deepseek-reasoner' ? 8192 : 4096}`);
  console.log(`   - API Key present: ${apiKey ? 'Yes' : 'No'}`);
  console.log(`   - API Key prefix: ${apiKey ? apiKey.substring(0, 8) + '...' : 'None'}`);
  
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
    max_tokens: selectedModel === 'deepseek-reasoner' ? 8192 : 4096, // Use realistic token limits
    top_p: 0.9
  });
  
  const apiRequestDuration = Date.now() - apiRequestStart;
  console.log(`✅ API call completed in ${apiRequestDuration}ms`);

  const translatedText = completion.choices[0]?.message?.content?.trim();

  if (!translatedText) {
    throw new Error('Empty response from translation service');
  }

  console.log(`Translation completed successfully using ${selectedModel}, output length: ${translatedText.length}`);

  return {
    translatedText: translatedText,
    sourceLanguage: from,
    targetLanguage: to,
    model: selectedModel,
    temperature: 1.3,
    originalLength: text.length,
    translatedLength: translatedText.length
  };
};

// Handle translation errors
const handleTranslationError = (error) => {
  console.error('🚨 DIAGNOSTIC: Translation error details:');
  console.error(`   - Error message: ${error.message}`);
  console.error(`   - Error code: ${error.code}`);
  console.error(`   - Error status: ${error.status}`);
  console.error(`   - Error response: ${JSON.stringify(error.response?.data || 'No response data')}`);
  console.error(`   - Full error:`, error);

  // Handle different types of errors
  if (error.code === 'insufficient_quota') {
    return {
      status: 429,
      error: 'API quota exceeded',
      message: 'Translation service temporarily unavailable due to quota limits. Please try again later.'
    };
  }

  if (error.code === 'invalid_api_key') {
    return {
      status: 401,
      error: 'API authentication failed',
      message: 'Translation service authentication error. Please contact administrator.'
    };
  }

  if (error.code === 'rate_limit_exceeded') {
    return {
      status: 429,
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please wait a moment and try again.'
    };
  }

  if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
    return {
      status: 408,
      error: 'Request timeout',
      message: 'Translation request timed out. Please try again with shorter text.'
    };
  }

  if (error.message.includes('No API key available')) {
    return {
      status: 500,
      error: 'API configuration error: No API key available',
      message: 'Please configure your API key in the API Settings tab or contact administrator.'
    };
  }

  // Generic error response
  return {
    status: 500,
    error: 'Translation service error',
    message: 'Unable to complete translation. Please try again later.',
    details: serverConfig.isDevelopment ? error.message : undefined
  };
};

module.exports = {
  createDeepSeekClient,
  getTranslationApiKey,
  getTranslationApiKeyFromCookies,
  translateText,
  handleTranslationError,
  selectModel,
  createSystemPrompt
};