# Deployment Guide

## Issues Fixed

### 1. Vercel 405 Error (Method Not Allowed)
**Problem**: Traditional Express server doesn't work with Vercel's serverless architecture.
**Solution**: Created Vercel-compatible API route at `pages/api/translate.js`

### 2. Local 431 Error (Request Header Fields Too Large)
**Problem**: Large API keys and request payloads exceeding server limits.
**Solution**: Increased server limits and optimized request structure.

## Vercel Deployment

### Prerequisites
1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Set up environment variables in Vercel dashboard

### Environment Variables (Vercel Dashboard)
Add these in your Vercel project settings:
```
DEEPSEEK_API_KEY=sk-your_actual_deepseek_api_key_here
```

### Files Added for Vercel Compatibility
- `api/translate.js` - Serverless function for translation API
- `vercel.json` - Vercel configuration with CORS headers

### Deployment Steps
1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel compatibility and fix API errors"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variable: `DEEPSEEK_API_KEY`
   - Deploy

3. **Test the deployment**:
   - Visit your Vercel URL
   - Try the translation functionality
   - Check both user API key and fallback scenarios

## Local Development

### Fixed Issues
- Increased request size limits to handle large API keys
- Optimized request structure to reduce header size
- Added proper timeout handling

### Running Locally
```bash
npm run dev
```

The app will run on:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## API Endpoint Structure

### Request Format
```javascript
POST /api/translate
Content-Type: application/json

{
  "text": "要翻译的中文文本",
  "from": "zh",
  "to": "en",
  "userApiKey": "sk-optional_user_api_key" // Optional
}
```

### Response Format
```javascript
{
  "translatedText": "Translated English text",
  "sourceLanguage": "zh",
  "targetLanguage": "en",
  "originalLength": 10,
  "translatedLength": 25
}
```

### Error Responses
- `400`: Invalid request or API key format
- `401`: Invalid API key
- `405`: Method not allowed (should not occur with new setup)
- `429`: Rate limit exceeded or quota exceeded
- `431`: Request too large (should not occur with new setup)
- `500`: Server error

## Testing

### Test Cases
1. **Translation with user API key**:
   - Add API key in API Settings tab
   - Try translating text
   - Should use user's key

2. **Translation with fallback key**:
   - Remove user API key
   - Try translating text
   - Should use server's default key

3. **Error handling**:
   - Try with invalid API key format
   - Try with very long text
   - Check error messages

### Debugging
- Check browser Network tab for request/response details
- Check Vercel function logs for serverless function errors
- Check local server console for development errors

## Environment Differences

### Local Development
- Uses Express server on port 3001
- Proxied through React dev server on port 3000
- Full server-side error logging

### Vercel Production
- Uses serverless functions
- Direct API calls to `/api/translate`
- Limited logging (check Vercel function logs)

## Security Notes
- API keys are validated on the server side
- User API keys are sent securely to the server (not exposed in browser)
- CORS headers properly configured
- Request size limits prevent abuse
