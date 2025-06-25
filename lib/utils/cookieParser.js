// Helper function to parse cookies from request headers
const parseCookies = (req) => {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=').trim();
      if (name && value) {
        cookies[name.trim()] = decodeURIComponent(value);
      }
    });
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