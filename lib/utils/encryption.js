const crypto = require('crypto');

// Server-side encryption utilities for API keys
const ALGORITHM = 'aes-256-cbc';

// Generate a deterministic encryption key that's consistent across all serverless functions
const getEncryptionKey = () => {
  // Use a deterministic approach that generates the same key across all serverless functions
  // This ensures consistency in Vercel's serverless environment where process.env.ENCRYPTION_KEY
  // might not be available or consistent
  
  // Create a deterministic seed using a combination of static values
  // This approach ensures the same key is generated every time across all function instances
  const staticSeed = 'translation-app-encryption-seed-v1.0.0';
  const additionalEntropy = 'deepseek-api-key-encryption-2025';
  
  // Generate a consistent 32-byte key using SHA-256 hash of the static seed
  const combinedSeed = staticSeed + additionalEntropy;
  const deterministicKey = crypto.createHash('sha256').update(combinedSeed, 'utf8').digest();
  
  // Verify the key is exactly 32 bytes (required for AES-256)
  if (deterministicKey.length !== 32) {
    throw new Error('Generated encryption key is not 32 bytes');
  }
  
  return deterministicKey;
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