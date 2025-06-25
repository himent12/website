// Vercel serverless function for storing API keys in session
require('dotenv').config();
const crypto = require('crypto');

// Server-side encryption utilities for API keys
const ALGORITHM = 'aes-256-cbc';

// Ensure encryption key is exactly 32 bytes for AES-256
const getEncryptionKey = () => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // If key is provided, ensure it's 32 bytes
    const keyBuffer = Buffer.from(envKey, 'hex');
    if (keyBuffer.length === 32) {
      return keyBuffer;
    }
    // If not 32 bytes, hash it to get consistent 32-byte key
    return crypto.createHash('sha256').update(envKey).digest();
  }
  // Generate a new 32-byte key if none provided
  return crypto.randomBytes(32);
};

const ENCRYPTION_KEY = getEncryptionKey();

const encryptApiKey = (apiKey) => {
  try {
    // Generate a random 16-byte IV for each encryption
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt API key');
  }
};

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
    const { keyName, keyValue } = req.body;
    
    if (!keyName || !keyValue) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both keyName and keyValue are required'
      });
    }
    
    // Validate API key format
    if (keyName === 'deepseek') {
      if (!keyValue.startsWith('sk-')) {
        return res.status(400).json({
          error: 'Invalid API key format',
          message: 'DeepSeek API keys must start with "sk-"'
        });
      }
      
      if (keyValue.length < 20 || keyValue.length > 100) {
        return res.status(400).json({
          error: 'Invalid API key length',
          message: 'DeepSeek API key length appears invalid'
        });
      }
    }
    
    // Encrypt the API key
    const encryptedKey = encryptApiKey(keyValue);
    
    // In serverless environment, we'll store the encrypted key in a secure cookie
    // since we don't have persistent session storage
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
    
    // Create a secure cookie with the session data
    const cookieValue = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    // Set secure cookie (httpOnly, secure in production, sameSite)
    const cookieOptions = [
      `session-${keyName}=${cookieValue}`,
      'HttpOnly',
      'Path=/',
      'Max-Age=3600', // 1 hour
      process.env.NODE_ENV === 'production' ? 'Secure' : '',
      process.env.NODE_ENV === 'production' ? 'SameSite=Strict' : 'SameSite=Lax'
    ].filter(Boolean).join('; ');
    
    res.setHeader('Set-Cookie', cookieOptions);
    
    console.log(`API key stored in secure cookie for ${keyName}`);
    
    res.json({
      success: true,
      message: 'API key stored successfully',
      metadata: {
        keyName,
        storedAt: sessionData.apiKeys[keyName].storedAt,
        keyLength: sessionData.apiKeys[keyName].keyLength,
        keyPrefix: sessionData.apiKeys[keyName].keyPrefix
      }
    });
    
  } catch (error) {
    console.error('Error storing API key:', error);
    res.status(500).json({
      error: 'Failed to store API key',
      message: 'An error occurred while storing the API key'
    });
  }
}