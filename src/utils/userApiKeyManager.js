// Simple XOR-based obfuscation (better than base64, but still not true encryption)
const obfuscateKey = (key) => {
  const obfuscationKey = 'DeepSeekTranslator2024'; // Static key for obfuscation
  let result = '';
  for (let i = 0; i < key.length; i++) {
    result += String.fromCharCode(
      key.charCodeAt(i) ^ obfuscationKey.charCodeAt(i % obfuscationKey.length)
    );
  }
  return btoa(result); // Base64 encode the obfuscated result
};

const deobfuscateKey = (obfuscatedKey) => {
  const obfuscationKey = 'DeepSeekTranslator2024';
  const decoded = atob(obfuscatedKey);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(
      decoded.charCodeAt(i) ^ obfuscationKey.charCodeAt(i % obfuscationKey.length)
    );
  }
  return result;
};

// Validate API key format
export const validateApiKey = (keyName, keyValue) => {
  if (!keyValue || typeof keyValue !== 'string') {
    return { valid: false, error: 'API key is required' };
  }

  // Remove whitespace
  const trimmedKey = keyValue.trim();

  if (trimmedKey.length === 0) {
    return { valid: false, error: 'API key cannot be empty' };
  }

  // DeepSeek API key validation
  if (keyName === 'deepseek') {
    // DeepSeek keys typically start with 'sk-' and are around 48-64 characters
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
  }

  return { valid: true, key: trimmedKey };
};

// Store user's API key in browser storage
export const saveUserApiKey = (keyName, keyValue) => {
  try {
    // Validate the API key first
    const validation = validateApiKey(keyName, keyValue);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Obfuscate the key before storing
    const obfuscatedKey = obfuscateKey(validation.key);
    localStorage.setItem(`apiKey_${keyName}`, obfuscatedKey);

    // Store metadata (without exposing the key)
    const metadata = {
      keyName,
      savedAt: new Date().toISOString(),
      keyLength: validation.key.length,
      keyPrefix: validation.key.substring(0, 6) + '...'
    };
    localStorage.setItem(`apiKeyMeta_${keyName}`, JSON.stringify(metadata));

    return { success: true };
  } catch (error) {
    console.error('Error saving API key:', error);
    return { success: false, error: 'Failed to save API key. Please try again.' };
  }
};

// Retrieve user's API key
export const getUserApiKey = (keyName) => {
  try {
    const obfuscatedKey = localStorage.getItem(`apiKey_${keyName}`);
    if (!obfuscatedKey) return null;

    // Deobfuscate the key
    return deobfuscateKey(obfuscatedKey);
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return null;
  }
};

// Get API key metadata (safe to display)
export const getApiKeyMetadata = (keyName) => {
  try {
    const metadata = localStorage.getItem(`apiKeyMeta_${keyName}`);
    return metadata ? JSON.parse(metadata) : null;
  } catch (error) {
    console.error('Error retrieving API key metadata:', error);
    return null;
  }
};

// Remove user's API key
export const removeUserApiKey = (keyName) => {
  try {
    localStorage.removeItem(`apiKey_${keyName}`);
    localStorage.removeItem(`apiKeyMeta_${keyName}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing API key:', error);
    return { success: false, error: 'Failed to remove API key' };
  }
};

// Check if user has stored an API key
export const hasUserApiKey = (keyName) => {
  return localStorage.getItem(`apiKey_${keyName}`) !== null;
};

// Clear all stored API keys (for security/privacy)
export const clearAllApiKeys = () => {
  try {
    const keys = Object.keys(localStorage);
    const apiKeys = keys.filter(key => key.startsWith('apiKey_') || key.startsWith('apiKeyMeta_'));

    apiKeys.forEach(key => localStorage.removeItem(key));

    return { success: true, clearedCount: apiKeys.length / 2 }; // Divide by 2 because we store key + metadata
  } catch (error) {
    console.error('Error clearing API keys:', error);
    return { success: false, error: 'Failed to clear API keys' };
  }
};