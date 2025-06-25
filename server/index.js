require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3001;

// Initialize DeepSeek client using OpenAI SDK
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '40mb' })); // Increase limit for longer texts

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

// Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Chinese-English Translation API Server',
    status: 'running',
    endpoints: {
      translate: 'POST /api/translate'
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
