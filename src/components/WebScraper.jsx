import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveTranslation } from '../utils/translationHistory';
import { getUserApiKey, hasUserApiKey } from '../utils/userApiKeyManager';

// Timer component to show elapsed translation time
const TranslationTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span>
      {(elapsed / 1000).toFixed(1)}s elapsed
    </span>
  );
};

const WebScraper = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [scrapedData, setScrapedData] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);
  const [isTranslatingLoading, setIsTranslatingLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [translationStartTime, setTranslationStartTime] = useState(null);
  const [translationDuration, setTranslationDuration] = useState(null);

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Please enter a URL to scrape');
      return;
    }

    setIsScrapingLoading(true);
    setError('');
    setScrapedData(null);
    setTranslatedText('');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      // Get response text first to avoid double JSON parsing
      const responseText = await response.text();

      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from server');
      }

      // Parse JSON once
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parsing failed. Raw response:', responseText.substring(0, 200));
        throw new Error('Invalid JSON response from server');
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `Scraping failed: ${response.status}`);
      }

      // Validate response structure
      if (!data.success || !data.data) {
        throw new Error('Invalid response structure from server');
      }

      setScrapedData(data.data);
    } catch (err) {
      // Ensure error message is properly serialized
      let errorMessage = 'Unknown error occurred';

      if (err && typeof err === 'object') {
        if (err.message && typeof err.message === 'string') {
          errorMessage = err.message;
        } else if (err.toString && typeof err.toString === 'function') {
          errorMessage = err.toString();
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(`Scraping error: ${errorMessage}`);
      console.error('Scraping error details:', {
        error: err,
        message: errorMessage,
        type: typeof err
      });
    } finally {
      setIsScrapingLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!scrapedData?.content) {
      setError('No content to translate');
      return;
    }

    setIsTranslatingLoading(true);
    setError('');
    setTranslationStartTime(Date.now());
    setTranslationDuration(null);
    
    // Check if user has their own API key
    const userHasApiKey = hasUserApiKey('deepseek');

    try {
      // Prepare request payload
      const requestBody = {
        text: scrapedData.content,
        from: 'zh',
        to: 'en',
        model: selectedModel
      };

      // Add user API key if available
      if (userHasApiKey) {
        const apiKey = getUserApiKey('deepseek');
        if (apiKey) {
          requestBody.userApiKey = apiKey;
        }
      }

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Get response text first to avoid double JSON parsing
      const responseText = await response.text();

      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from translation server');
      }

      // Parse JSON once
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Translation JSON parsing failed. Raw response:', responseText.substring(0, 200));
        // Check if this looks like an HTML error page (common with proxy errors)
        if (responseText.toLowerCase().includes('<html') || responseText.toLowerCase().includes('proxy error')) {
          throw new Error('Translation service is temporarily unavailable. Please try again later.');
        }
        throw new Error('Invalid JSON response from translation server');
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `Translation failed: ${response.status}`);
      }
      const translated = data.translatedText || data.translation || '';
      
      // Calculate translation duration
      const duration = Date.now() - translationStartTime;
      setTranslationDuration(duration);
      
      setTranslatedText(translated);

      // Save to translation history if translation was successful
      if (translated && translated.trim().length > 0) {
        saveTranslation(scrapedData.content, translated);
      }
    } catch (err) {
      // Ensure error message is properly serialized
      let errorMessage = 'Unknown error occurred';

      if (err && typeof err === 'object') {
        if (err.message && typeof err.message === 'string') {
          errorMessage = err.message;
        } else if (err.toString && typeof err.toString === 'function') {
          errorMessage = err.toString();
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(`Translation error: ${errorMessage}`);
      console.error('Translation error details:', {
        error: err,
        message: errorMessage,
        type: typeof err
      });
    } finally {
      setIsTranslatingLoading(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setScrapedData(null);
    setTranslatedText('');
    setError('');
    setTranslationDuration(null);
    setSelectedModel('deepseek-chat');
  };

  const handleCopyTranslation = async () => {
    if (translatedText) {
      try {
        await navigator.clipboard.writeText(translatedText);
        // You could add a toast notification here
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  const handleOpenReadingMode = () => {
    if (translatedText) {
      navigate('/reading', {
        state: {
          translatedText: translatedText,
          originalText: scrapedData.content,
          title: scrapedData.title,
          sourceUrl: scrapedData.url
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile-Optimized Header */}
      <div className="text-center px-4 py-6 sm:py-8 bg-gradient-to-r from-green-50 to-blue-50">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          Web Scraper & Translator
        </h1>
        <p className="text-base sm:text-lg text-gray-600">
          Extract and Translate Web Content
        </p>
        <div className="w-16 sm:w-24 h-1 bg-green-500 mx-auto mt-3 sm:mt-4 rounded-full"></div>
      </div>

      {/* Mobile-First Interface */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

        {/* URL Input Section */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 flex items-center">
              <span className="w-6 h-6 sm:w-7 sm:h-7 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2 sm:mr-3">
                🌐
              </span>
              <span className="hidden sm:inline">Website URL</span>
              <span className="sm:hidden">URL</span>
            </h2>
            <button
              onClick={handleClear}
              className="min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            >
              Clear
            </button>
          </div>

          <div className="relative mb-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL (e.g., https://www.69shuba.com/...)"
              className="w-full p-4 sm:p-5
                         border-2 border-gray-200 rounded-xl
                         focus:border-green-500 focus:ring-2 focus:ring-green-200
                         focus:outline-none transition-all duration-200
                         text-base sm:text-lg
                         touch-manipulation"
              disabled={isScrapingLoading}
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
            />
          </div>

          <button
            onClick={handleScrape}
            disabled={isScrapingLoading || !url.trim()}
            className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
                       text-white font-semibold py-3 px-6 rounded-xl
                       transition-all duration-200 ease-in-out
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                       touch-manipulation text-base sm:text-lg"
          >
            {isScrapingLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Scraping...
              </div>
            ) : (
              'Scrape Content'
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Scraped Content Display */}
        {scrapedData && (
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-700 flex items-center">
                <span className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2 sm:mr-3">
                  📄
                </span>
                <span className="hidden sm:inline">Scraped Content</span>
                <span className="sm:hidden">Content</span>
              </h2>
            </div>

            {/* Model Selection and Translation Controls */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Translation Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isTranslatingLoading}
                    className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg
                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                               disabled:bg-gray-100 disabled:cursor-not-allowed
                               text-base touch-manipulation"
                  >
                    <option value="deepseek-chat">Chat Model (Faster)</option>
                    <option value="deepseek-reasoner">Reasoner Model (More Thoughtful)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedModel === 'deepseek-chat'
                      ? 'Quick and efficient translation'
                      : 'Advanced reasoning for complex content'}
                  </p>
                </div>
                
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslatingLoading || !scrapedData.content}
                    className="min-h-[44px] px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                               text-white font-semibold rounded-lg
                               transition-all duration-200 ease-in-out
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                               touch-manipulation text-sm sm:text-base w-full sm:w-auto"
                  >
                    {isTranslatingLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Translating...
                      </div>
                    ) : (
                      'Translate'
                    )}
                  </button>
                  
                  {/* Translation Timer */}
                  {isTranslatingLoading && translationStartTime && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      <TranslationTimer startTime={translationStartTime} />
                    </div>
                  )}
                  
                  {translationDuration && !isTranslatingLoading && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      Completed in {(translationDuration / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 mb-4">
              <h3 className="font-semibold text-gray-800 mb-2 text-base sm:text-lg">
                {scrapedData.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-3">
                Source: {scrapedData.url} • {scrapedData.wordCount} words
              </p>
              <div className="max-h-64 overflow-y-auto">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {scrapedData.content}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Translation Output */}
        {translatedText && (
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-700 flex items-center">
                <span className="w-6 h-6 sm:w-7 sm:h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2 sm:mr-3">
                  EN
                </span>
                <span className="hidden sm:inline">English Translation</span>
                <span className="sm:hidden">Translation</span>
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopyTranslation}
                  className="min-h-[44px] px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                >
                  Copy
                </button>
                <button
                  onClick={handleOpenReadingMode}
                  className="min-h-[44px] px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors touch-manipulation"
                >
                  Reading Mode
                </button>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 sm:p-5">
              <div className="max-h-96 overflow-y-auto">
                <p className="text-sm sm:text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {translatedText}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-200 text-xs sm:text-sm text-purple-600 flex flex-wrap items-center gap-2">
                <span>Translation completed • {translatedText.split(/\s+/).length} words</span>
                {translationDuration && (
                  <span>• {(translationDuration / 1000).toFixed(1)}s</span>
                )}
                <span>• Model: {selectedModel === 'deepseek-chat' ? 'Chat' : 'Reasoner'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebScraper;
