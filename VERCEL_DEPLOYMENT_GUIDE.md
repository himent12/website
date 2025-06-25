# Vercel Serverless Functions Deployment Guide

## Overview

The Express server has been successfully converted to Vercel serverless functions to resolve the deployment error. The original error was:

```
Error: The pattern "api/translate.js" defined in `functions` doesn't match any Serverless Functions inside the `api` directory.
```

## Changes Made

### 1. Created Serverless Functions

The following serverless functions have been created in the `api/` directory:

- **`api/translate.js`** - Translation service using DeepSeek API
- **`api/scrape.js`** - Web scraping functionality for Chinese novel sites
- **`api/session/store-key.js`** - Store encrypted API keys in secure cookies
- **`api/session/verify-key.js`** - Verify if API keys exist in session
- **`api/session/clear-key.js`** - Clear API keys from session
- **`api/health.js`** - Health check endpoint

### 2. Updated Configuration

Updated `vercel.json` to include all serverless functions with appropriate timeout settings:

```json
{
  "functions": {
    "api/translate.js": { "maxDuration": 30 },
    "api/scrape.js": { "maxDuration": 60 },
    "api/session/store-key.js": { "maxDuration": 10 },
    "api/session/verify-key.js": { "maxDuration": 10 },
    "api/session/clear-key.js": { "maxDuration": 10 },
    "api/health.js": { "maxDuration": 5 }
  }
}
```

### 3. Session Management Adaptation

Since Vercel serverless functions are stateless, session management has been adapted to use secure HTTP-only cookies instead of server-side sessions:

- API keys are encrypted using AES-256-CBC before storage
- Cookies are set with appropriate security flags (HttpOnly, Secure in production, SameSite)
- Cookie parsing is handled manually in serverless functions

### 4. Maintained Security Features

All security features from the original Express server have been preserved:

- API key encryption/decryption
- Input validation
- Error handling
- CORS configuration
- Request timeouts

## API Endpoints

### Translation
- **POST** `/api/translate`
- Translates Chinese text to English using DeepSeek API
- Supports both user-provided and server-default API keys

### Web Scraping
- **POST** `/api/scrape`
- Scrapes content from Chinese novel websites (optimized for 69shuba.com)
- Handles encoding detection and content extraction

### Session Management
- **POST** `/api/session/store-key` - Store API key
- **GET** `/api/session/verify-key?keyName=deepseek` - Check if key exists
- **DELETE** `/api/session/clear-key` - Remove API key

### Health Check
- **GET** `/api/health` - Service status and endpoint information

## Environment Variables Required

Ensure these environment variables are set in Vercel:

```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
ENCRYPTION_KEY=your_32_byte_hex_encryption_key
NODE_ENV=production
```

## Deployment Steps

1. **Commit all changes** to your repository
2. **Push to your connected Git repository** (GitHub, GitLab, etc.)
3. **Vercel will automatically deploy** the serverless functions
4. **Test the endpoints** using the health check: `GET /api/health`

## Testing the Deployment

After deployment, you can test the functions:

1. **Health Check**: `GET https://your-domain.vercel.app/api/health`
2. **Translation**: `POST https://your-domain.vercel.app/api/translate`
3. **Scraping**: `POST https://your-domain.vercel.app/api/scrape`

## Frontend Compatibility

The frontend code should work without changes because:

- All API endpoints maintain the same paths (`/api/translate`, `/api/scrape`, etc.)
- Request/response formats are identical to the original Express server
- CORS headers are properly configured for cross-origin requests

## Original Express Server

The original Express server (`server/index.js`) is preserved for local development if needed, but the deployed version will use the serverless functions.

## Troubleshooting

If you encounter issues:

1. **Check Vercel Function Logs** in the Vercel dashboard
2. **Verify Environment Variables** are set correctly
3. **Test individual endpoints** using the health check first
4. **Check CORS settings** if frontend requests fail

## Benefits of Serverless Architecture

- **Automatic scaling** based on demand
- **Pay-per-use** pricing model
- **No server maintenance** required
- **Global edge deployment** for better performance
- **Built-in monitoring** and logging

The conversion maintains all functionality while providing better scalability and deployment reliability on Vercel.