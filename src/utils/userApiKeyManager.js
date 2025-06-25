// Server-side session-based API key management
// Replaces client-side storage with secure server-side session management

// API endpoints for session management
const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

// Store API key on server-side session
export const saveUserApiKey = async (keyName, keyValue) => {
  try {
    const response = await fetch(`${API_BASE}/api/session/store-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify({
        keyName,
        keyValue
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: result.error || 'Failed to save API key' 
      };
    }

    return { 
      success: true,
      metadata: result.metadata
    };
  } catch (error) {
    console.error('Error saving API key:', error);
    return { 
      success: false, 
      error: 'Network error: Unable to save API key. Please check your connection.' 
    };
  }
};

// Check if API key exists in server-side session
export const getUserApiKey = async (keyName) => {
  try {
    const response = await fetch(`${API_BASE}/api/session/verify-key?keyName=${encodeURIComponent(keyName)}`, {
      method: 'GET',
      credentials: 'include', // Include session cookies
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Error verifying API key:', result.error);
      return null;
    }

    // Return a placeholder since we don't want to expose the actual key
    return result.hasKey ? 'session-stored-key' : null;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return null;
  }
};

// Get API key metadata (safe to display)
export const getApiKeyMetadata = async (keyName) => {
  try {
    const response = await fetch(`${API_BASE}/api/session/verify-key?keyName=${encodeURIComponent(keyName)}`, {
      method: 'GET',
      credentials: 'include', // Include session cookies
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Error getting API key metadata:', result.error);
      return null;
    }

    return result.hasKey ? result.metadata : null;
  } catch (error) {
    console.error('Error retrieving API key metadata:', error);
    return null;
  }
};

// Remove API key from server-side session
export const removeUserApiKey = async (keyName) => {
  try {
    const response = await fetch(`${API_BASE}/api/session/clear-key`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include session cookies
      body: JSON.stringify({
        keyName
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        error: result.error || 'Failed to remove API key' 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing API key:', error);
    return { 
      success: false, 
      error: 'Network error: Unable to remove API key. Please check your connection.' 
    };
  }
};

// Check if user has stored an API key in session
export const hasUserApiKey = async (keyName) => {
  try {
    const response = await fetch(`${API_BASE}/api/session/verify-key?keyName=${encodeURIComponent(keyName)}`, {
      method: 'GET',
      credentials: 'include', // Include session cookies
    });

    const result = await response.json();

    if (!response.ok) {
      return false;
    }

    return result.hasKey;
  } catch (error) {
    console.error('Error checking API key:', error);
    return false;
  }
};

// Clear all stored API keys from session
export const clearAllApiKeys = async () => {
  try {
    // For now, we'll just clear the deepseek key since that's what we support
    // In the future, this could be expanded to clear multiple keys
    const result = await removeUserApiKey('deepseek');
    
    return {
      success: result.success,
      clearedCount: result.success ? 1 : 0,
      error: result.error
    };
  } catch (error) {
    console.error('Error clearing API keys:', error);
    return { 
      success: false, 
      error: 'Network error: Unable to clear API keys. Please check your connection.' 
    };
  }
};

// Validate API key format with enhanced security checks
export const validateApiKey = (keyName, keyValue) => {
  try {
    // Sanitize and validate API key input
    if (!keyValue || typeof keyValue !== 'string') {
      return { valid: false, error: 'API key is required' };
    }
    
    // Remove whitespace and control characters
    // eslint-disable-next-line no-control-regex
    const sanitized = keyValue.trim().replace(/[\x00-\x1F\x7F]/g, '');
    
    // Check for suspicious patterns
    if (sanitized.includes('<script') || sanitized.includes('javascript')) {
      return { valid: false, error: 'Invalid characters detected in API key' };
    }
    
    if (sanitized.length === 0) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    // Enhanced validation for DeepSeek API keys
    if (keyName === 'deepseek') {
      // DeepSeek keys must start with 'sk-'
      if (!sanitized.startsWith('sk-')) {
        return { valid: false, error: 'DeepSeek API keys must start with "sk-"' };
      }

      // Length validation
      if (sanitized.length < 20 || sanitized.length > 100) {
        return { valid: false, error: 'DeepSeek API key length appears invalid' };
      }

      // Character validation - only allow alphanumeric, hyphens, and underscores
      if (!/^sk-[A-Za-z0-9_-]+$/.test(sanitized)) {
        return { valid: false, error: 'DeepSeek API key contains invalid characters' };
      }
      
      // Additional entropy check - ensure key has sufficient randomness
      const keyPart = sanitized.substring(3); // Remove 'sk-' prefix
      const uniqueChars = new Set(keyPart).size;
      if (uniqueChars < 10) {
        return { valid: false, error: 'API key appears to have insufficient entropy' };
      }
    }

    return { valid: true, key: sanitized };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Utility function to check if session-based storage is supported
export const isEncryptionSupported = () => {
  // Since we're using server-side sessions, this always returns true
  // if the server is available
  return true;
};

// Migration utility - no longer needed since we're using server-side sessions
export const migrateFromLocalStorage = async () => {
  try {
    // Clear any old client-side stored keys for security
    const localKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('apiKey_') || key.startsWith('apiKeyMeta_')
    );
    
    localKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Also clear sessionStorage
    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.startsWith('apiKey_') || key.startsWith('apiKeyMeta_')
    );
    
    sessionKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    return { 
      success: true, 
      migrated: localKeys.length + sessionKeys.length,
      message: 'Cleared old client-side API keys for security'
    };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error: 'Failed to clear old keys' };
  }
};

// Helper function to get session status
export const getSessionStatus = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      credentials: 'include',
    });

    return {
      connected: response.ok,
      serverAvailable: response.ok
    };
  } catch (error) {
    return {
      connected: false,
      serverAvailable: false,
      error: error.message
    };
  }
};