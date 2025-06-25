// Helper function to parse cookies from request headers with enhanced validation
const parseCookies = (req) => {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  
  if (!cookieHeader) {
    return cookies;
  }
  
  try {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=').trim();
      
      if (name && value) {
        const trimmedName = name.trim();
        
        try {
          // Enhanced URL decoding with validation for base64-encoded session data
          let decodedValue = decodeURIComponent(value);
          
          // Validate base64 encoding for session cookies
          if (trimmedName.startsWith('session-')) {
            // Check if the value looks like valid base64
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(decodedValue)) {
              console.warn(`Invalid base64 format for session cookie: ${trimmedName}`);
              return; // Skip this cookie
            }
            
            // Test if we can decode the base64 and parse as JSON
            try {
              const testDecode = Buffer.from(decodedValue, 'base64').toString();
              JSON.parse(testDecode);
            } catch (validationError) {
              console.warn(`Corrupted session cookie data for: ${trimmedName}`);
              return; // Skip this cookie
            }
          }
          
          cookies[trimmedName] = decodedValue;
        } catch (decodeError) {
          console.warn(`Failed to decode cookie ${trimmedName}:`, decodeError.message);
          // Skip corrupted cookies instead of failing entirely
        }
      }
    });
  } catch (parseError) {
    console.error('Error parsing cookie header:', parseError.message);
    // Return empty cookies object instead of throwing
  }
  
  return cookies;
};

// Helper function to create secure cookie options
const createCookieOptions = (keyName, cookieValue, isProduction = false) => {
  const cookieOptions = [
    `session-${keyName}=${cookieValue}`,
    'HttpOnly',
    'Path=/',
    'Max-Age=3600', // 1 hour
    isProduction ? 'Secure' : '',
    isProduction ? 'SameSite=Strict' : 'SameSite=Lax'
  ].filter(Boolean).join('; ');
  
  return cookieOptions;
};

// Helper function to create cookie expiration options
const createExpiredCookieOptions = (keyName, isProduction = false) => {
  const cookieOptions = [
    `session-${keyName}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0', // Expire immediately
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT', // Set to past date
    isProduction ? 'Secure' : '',
    isProduction ? 'SameSite=Strict' : 'SameSite=Lax'
  ].filter(Boolean).join('; ');
  
  return cookieOptions;
};

module.exports = {
  parseCookies,
  createCookieOptions,
  createExpiredCookieOptions
};