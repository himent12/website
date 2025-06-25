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

const decryptApiKey = (encryptedData) => {
  try {
    const { encrypted, iv } = encryptedData;
    
    // Convert IV from hex string back to buffer
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

module.exports = {
  encryptApiKey,
  decryptApiKey,
  ALGORITHM,
  ENCRYPTION_KEY
};