// Input validation helper for translation requests
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

// Standalone validation function for serverless environments
const validateTranslationData = (data) => {
  const { text, from, to, model } = data;

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

module.exports = {
  validateTranslationRequest,
  validateTranslationData
};