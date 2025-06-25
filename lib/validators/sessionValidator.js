// Session validation helpers
const validateApiKeyFormat = (keyName, keyValue) => {
  if (!keyName || !keyValue) {
    return {
      valid: false,
      error: 'Missing required fields',
      message: 'Both keyName and keyValue are required'
    };
  }

  // Validate API key format for specific providers
  if (keyName === 'deepseek') {
    if (!keyValue.startsWith('sk-')) {
      return {
        valid: false,
        error: 'Invalid API key format',
        message: 'DeepSeek API keys must start with "sk-"'
      };
    }
    
    if (keyValue.length < 20 || keyValue.length > 100) {
      return {
        valid: false,
        error: 'Invalid API key length',
        message: 'DeepSeek API key length appears invalid'
      };
    }
  }

  return { valid: true };
};

// Validate session data structure
const validateSessionData = (sessionData) => {
  if (!sessionData || typeof sessionData !== 'object') {
    return {
      valid: false,
      error: 'Invalid session data',
      message: 'Session data must be a valid object'
    };
  }

  if (!sessionData.apiKeys || typeof sessionData.apiKeys !== 'object') {
    return {
      valid: false,
      error: 'Invalid session structure',
      message: 'Session must contain apiKeys object'
    };
  }

  return { valid: true };
};

// Validate encrypted API key structure
const validateEncryptedKey = (encryptedKey) => {
  if (!encryptedKey || typeof encryptedKey !== 'object') {
    return {
      valid: false,
      error: 'Invalid encrypted key',
      message: 'Encrypted key must be a valid object'
    };
  }

  if (!encryptedKey.encrypted || !encryptedKey.iv) {
    return {
      valid: false,
      error: 'Invalid encrypted key structure',
      message: 'Encrypted key must contain encrypted data and IV'
    };
  }

  if (typeof encryptedKey.encrypted !== 'string' || typeof encryptedKey.iv !== 'string') {
    return {
      valid: false,
      error: 'Invalid encrypted key format',
      message: 'Encrypted data and IV must be strings'
    };
  }

  return { valid: true };
};

module.exports = {
  validateApiKeyFormat,
  validateSessionData,
  validateEncryptedKey
};