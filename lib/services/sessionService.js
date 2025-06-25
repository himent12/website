const { encryptApiKey, decryptApiKey } = require('../utils/encryption');
const { parseCookies } = require('../utils/cookieParser');

// Helper function to get decrypted API key from session
const getSessionApiKey = (req, keyName) => {
  try {
    if (!req.session.apiKeys || !req.session.apiKeys[keyName]) {
      return null;
    }
    
    return decryptApiKey(req.session.apiKeys[keyName]);
  } catch (error) {
    console.error('Error retrieving session API key:', error);
    return null;
  }
};

// Helper function to get decrypted API key from cookies (for serverless)
const getSessionApiKeyFromCookies = (req, keyName) => {
  console.log(`🍪 Retrieving session API key for: ${keyName}`);
  try {
    // Parse cookies from request headers
    const cookies = parseCookies(req);
    console.log(`   - Found ${Object.keys(cookies).length} cookies`);
    
    const sessionCookie = cookies[`session-${keyName}`];
    
    if (!sessionCookie) {
      console.log('   - No session cookie found');
      return null;
    }
    
    console.log('   - Decoding session cookie');
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
    } catch (decodeError) {
      console.error('   - Failed to decode session cookie:', decodeError.message);
      throw new Error('CORRUPTED_SESSION_DATA');
    }
    
    if (!sessionData.apiKeys || !sessionData.apiKeys[keyName]) {
      console.log(`   - No API key found for ${keyName} in session`);
      return null;
    }
    
    console.log('   - Attempting to decrypt API key');
    try {
      const decryptedKey = decryptApiKey(sessionData.apiKeys[keyName]);
      console.log(`   - Successfully decrypted API key (length: ${decryptedKey?.length || 0})`);
      return decryptedKey;
    } catch (decryptError) {
      console.error('   - Decryption failed:', decryptError.message);
      
      // Check for specific decryption errors that indicate key inconsistency
      if (decryptError.message.includes('bad decrypt') ||
          decryptError.message.includes('wrong final block length') ||
          decryptError.message.includes('Provider routines')) {
        console.error('   - ENCRYPTION KEY MISMATCH DETECTED: Different serverless functions using different keys');
        throw new Error('ENCRYPTION_KEY_MISMATCH');
      }
      
      throw new Error('DECRYPTION_FAILED');
    }
  } catch (error) {
    console.error('❌ Error retrieving session API key:', error.message);
    
    // Provide specific error types for better handling
    if (error.message === 'CORRUPTED_SESSION_DATA') {
      console.error('   - Session data is corrupted or invalid');
    } else if (error.message === 'ENCRYPTION_KEY_MISMATCH') {
      console.error('   - Encryption key mismatch between serverless functions');
    } else if (error.message === 'DECRYPTION_FAILED') {
      console.error('   - Failed to decrypt stored API key');
    }
    
    return null;
  }
};

// Store API key in session
const storeApiKeyInSession = (req, keyName, keyValue) => {
  try {
    // Encrypt the API key
    const encryptedKey = encryptApiKey(keyValue);
    
    // Store in server-side session
    if (!req.session.apiKeys) {
      req.session.apiKeys = {};
    }
    
    req.session.apiKeys[keyName] = {
      encrypted: encryptedKey.encrypted,
      iv: encryptedKey.iv,
      storedAt: new Date().toISOString(),
      keyLength: keyValue.length,
      keyPrefix: keyValue.substring(0, 6) + '...'
    };
    
    console.log(`API key stored in session for ${keyName}`);
    
    return {
      success: true,
      metadata: {
        keyName,
        storedAt: req.session.apiKeys[keyName].storedAt,
        keyLength: req.session.apiKeys[keyName].keyLength,
        keyPrefix: req.session.apiKeys[keyName].keyPrefix
      }
    };
  } catch (error) {
    console.error('Error storing API key in session:', error);
    throw error;
  }
};

// Create session data for cookie storage (serverless)
const createSessionData = (keyName, keyValue) => {
  try {
    // Encrypt the API key
    const encryptedKey = encryptApiKey(keyValue);
    
    // Create session data structure
    const sessionData = {
      apiKeys: {
        [keyName]: {
          encrypted: encryptedKey.encrypted,
          iv: encryptedKey.iv,
          storedAt: new Date().toISOString(),
          keyLength: keyValue.length,
          keyPrefix: keyValue.substring(0, 6) + '...'
        }
      }
    };
    
    // Create a secure cookie value
    const cookieValue = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    return {
      cookieValue,
      metadata: {
        keyName,
        storedAt: sessionData.apiKeys[keyName].storedAt,
        keyLength: sessionData.apiKeys[keyName].keyLength,
        keyPrefix: sessionData.apiKeys[keyName].keyPrefix
      }
    };
  } catch (error) {
    console.error('Error creating session data:', error);
    throw error;
  }
};

// Verify API key exists in session
const verifySessionApiKey = (req, keyName) => {
  try {
    const hasKey = req.session.apiKeys && req.session.apiKeys[keyName];
    
    if (hasKey) {
      return {
        hasKey: true,
        metadata: {
          keyName,
          storedAt: req.session.apiKeys[keyName].storedAt,
          keyLength: req.session.apiKeys[keyName].keyLength,
          keyPrefix: req.session.apiKeys[keyName].keyPrefix
        }
      };
    } else {
      return {
        hasKey: false
      };
    }
  } catch (error) {
    console.error('Error verifying session API key:', error);
    return {
      hasKey: false
    };
  }
};

// Verify API key exists in cookies (serverless)
const verifySessionApiKeyFromCookies = (req, keyName) => {
  try {
    const cookies = parseCookies(req);
    const sessionCookie = cookies[`session-${keyName}`];
    
    if (sessionCookie) {
      try {
        // Decode the session data from the cookie
        const sessionData = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
        
        if (sessionData.apiKeys && sessionData.apiKeys[keyName]) {
          return {
            hasKey: true,
            metadata: {
              keyName,
              storedAt: sessionData.apiKeys[keyName].storedAt,
              keyLength: sessionData.apiKeys[keyName].keyLength,
              keyPrefix: sessionData.apiKeys[keyName].keyPrefix
            }
          };
        } else {
          return {
            hasKey: false
          };
        }
      } catch (decodeError) {
        console.error('Error decoding session cookie:', decodeError);
        return {
          hasKey: false
        };
      }
    } else {
      return {
        hasKey: false
      };
    }
  } catch (error) {
    console.error('Error verifying session API key from cookies:', error);
    return {
      hasKey: false
    };
  }
};

// Clear API key from session
const clearSessionApiKey = (req, keyName) => {
  try {
    if (req.session.apiKeys && req.session.apiKeys[keyName]) {
      delete req.session.apiKeys[keyName];
      console.log(`API key cleared from session for ${keyName}`);
      
      return {
        success: true,
        message: 'API key cleared successfully'
      };
    } else {
      return {
        success: true,
        message: 'No API key found to clear'
      };
    }
  } catch (error) {
    console.error('Error clearing session API key:', error);
    throw error;
  }
};

module.exports = {
  getSessionApiKey,
  getSessionApiKeyFromCookies,
  storeApiKeyInSession,
  createSessionData,
  verifySessionApiKey,
  verifySessionApiKeyFromCookies,
  clearSessionApiKey
};